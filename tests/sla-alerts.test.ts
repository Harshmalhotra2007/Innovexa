import { generateSLAEscalationEmailHtml, sendSLAEscalationEmail } from "../src/lib/email-engine";
import { checkAndEscalateOverdueTasks } from "../src/lib/escalation-engine";
import { GET, PATCH } from "../src/app/api/notifications/route";
import { db } from "../src/lib/db";
import { config } from "../src/lib/config";

config.resendApiKey = "";

// Mock Prisma DB
jest.mock("../src/lib/db", () => ({
  db: {
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe("SLA Escalation Email Generator", () => {
  it("should generate valid responsive HTML for SLA Warning emails", () => {
    const html = generateSLAEscalationEmailHtml({
      taskId: "task-1",
      taskTitle: "Update Core API Endpoints",
      ownerName: "Alex Mercer",
      recipientEmail: "alex@innovexa.com",
      department: "Engineering",
      priority: "High",
      type: "Warning",
      hoursOverdue: 2.5,
      deadline: new Date().toISOString(),
    });

    expect(html).toContain("INNOVEXA SLA MONITOR");
    expect(html).toContain("SLA Deadline Alert");
    expect(html).toContain("Update Core API Endpoints");
    expect(html).toContain("Alex Mercer");
  });

  it("should generate valid HTML for Manager Escalation emails", () => {
    const html = generateSLAEscalationEmailHtml({
      taskId: "task-2",
      taskTitle: "Refactor Database Indexes",
      ownerName: "Sarah Jenkins",
      recipientEmail: "manager.engineering@innovexa.com",
      department: "Engineering",
      priority: "Critical",
      type: "Escalation",
      hoursOverdue: 28,
      deadline: new Date().toISOString(),
    });

    expect(html).toContain("SLA Manager Escalation");
    expect(html).toContain("28 hours");
    expect(html).toContain("manager.engineering@innovexa.com");
  });
});

describe("SLA Escalation Engine & Notification Loop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should audit active tasks and flag Level 1 (Overdue) and Level 2 (Escalated)", async () => {
    const pastDeadline = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30 hours ago
    const recentOverdue = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    (db.task.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "t1",
        title: "Task Level 1",
        ownerName: "Dev One",
        ownerEmail: "dev1@innovexa.com",
        department: "Engineering",
        priority: "High",
        status: "Pending",
        deadline: recentOverdue,
        escalationLevel: 0,
      },
      {
        id: "t2",
        title: "Task Level 2",
        ownerName: "Dev Two",
        ownerEmail: "dev2@innovexa.com",
        department: "Engineering",
        priority: "High",
        status: "Overdue",
        deadline: pastDeadline,
        escalationLevel: 1,
      },
    ]);

    (db.department.findMany as jest.Mock).mockResolvedValueOnce([
      { name: "Engineering", managerName: "Rajesh Kumar", code: "ENG" },
    ]);

    (db.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (db.notification.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (db.notification.create as jest.Mock).mockResolvedValue({ id: "notif-1" });

    const summary = await checkAndEscalateOverdueTasks();

    expect(summary.checkedCount).toBe(2);
    expect(summary.newOverdueCount).toBe(1);
    expect(summary.newEscalatedCount).toBe(1);
    expect(db.task.updateMany).toHaveBeenCalledTimes(2);
  });

  it("should promote a 10-day overdue Level 0 task directly to Level 2 (Escalated) in one pass", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    (db.task.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "t-10d",
        title: "Legacy Refactor 10d Overdue",
        ownerName: "Dev Veteran",
        ownerEmail: "vet@innovexa.com",
        department: "Engineering",
        priority: "Critical",
        status: "Pending",
        deadline: tenDaysAgo,
        escalationLevel: 0,
      },
    ]);

    (db.department.findMany as jest.Mock).mockResolvedValueOnce([
      { name: "Engineering", managerName: "Rajesh Kumar", code: "ENG" },
    ]);

    (db.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (db.notification.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const summary = await checkAndEscalateOverdueTasks();

    expect(summary.checkedCount).toBe(1);
    expect(summary.newOverdueCount).toBe(0);
    expect(summary.newEscalatedCount).toBe(1);
    expect(db.task.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["t-10d"] } },
      data: expect.objectContaining({
        status: "Escalated",
        escalationLevel: 2,
      }),
    });
  });
});

describe("Notifications API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return unread count and notification events on GET", async () => {
    (db.notification.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "n1",
        taskId: "t1",
        recipient: "dev1@innovexa.com",
        subject: "⚠️ Task Overdue",
        body: "Your task is past deadline",
        type: "Warning",
        read: false,
        sentAt: new Date(),
        task: { id: "t1", title: "Task 1", department: "Engineering" },
      },
      {
        id: "n2",
        taskId: "t2",
        recipient: "manager@innovexa.com",
        subject: "🚨 SLA Escalation Alert",
        body: "Task escalated to manager",
        type: "Escalation",
        read: true,
        sentAt: new Date(),
        task: { id: "t2", title: "Task 2", department: "Engineering" },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.unreadCount).toBe(1);
    expect(data.notifications.length).toBe(2);
  });

  it("should mark notifications as read on PATCH with markAllRead", async () => {
    (db.notification.updateMany as jest.Mock).mockResolvedValueOnce({ count: 5 });

    const req = new Request("http://localhost/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { read: false },
      data: { read: true },
    });
  });
});

import { POST as sendSLAEmailPOST } from "../src/app/api/tasks/send-sla-email/route";

describe("Manual SLA Email Dispatch API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully fetch task and send SLA warning email", async () => {
    (db.task.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "task-1",
      title: "Core API Sec",
      ownerName: "Dev One",
      ownerEmail: "dev1@innovexa.com",
      department: "Engineering",
      priority: "High",
      status: "Pending",
      deadline: new Date(Date.now() - 3600000), // 1 hour overdue
      escalationLevel: 0,
    });

    (db.department.findMany as jest.Mock).mockResolvedValueOnce([
      { name: "Engineering", managerName: "Rajesh Kumar", code: "ENG" },
    ]);

    const req = new Request("http://localhost/api/tasks/send-sla-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1" }),
    });

    const res = await sendSLAEmailPOST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.type).toBe("Warning");
    expect(data.recipient).toBe("dev1@innovexa.com");
  });
});
