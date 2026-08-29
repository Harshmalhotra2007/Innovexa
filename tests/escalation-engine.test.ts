import { checkAndEscalateOverdueTasks } from "../src/lib/escalation-engine";
import { db } from "../src/lib/db";
import { config } from "../src/lib/config";

// Mock Prisma DB
jest.mock("../src/lib/db", () => ({
  db: {
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
    },
    notification: {
      createMany: jest.fn(),
    },
  },
}));

describe("SLA Escalation Engine Core Tests", () => {
  beforeAll(() => {
    config.resendApiKey = "";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process overdue tasks and promote to Level 1 (Overdue) and Level 2 (Escalated)", async () => {
    const now = Date.now();
    const past2Hours = new Date(now - 2 * 3600 * 1000); // 2 hrs past deadline -> Level 1 Overdue
    const past26Hours = new Date(now - 26 * 3600 * 1000); // 26 hrs past deadline -> Level 2 Escalated

    (db.department.findMany as jest.Mock).mockResolvedValue([
      { name: "Engineering", managerName: "Sarah Chen", code: "ENG" },
    ]);

    (db.task.findMany as jest.Mock).mockResolvedValue([
      {
        id: "task-level-1",
        title: "Fix auth edge case",
        department: "Engineering",
        ownerName: "Alice Dev",
        ownerEmail: "alice@innovexa.com",
        deadline: past2Hours,
        status: "Pending",
        escalationLevel: 0,
      },
      {
        id: "task-level-2",
        title: "Database index migration",
        department: "Engineering",
        ownerName: "Bob Dev",
        ownerEmail: "bob@innovexa.com",
        deadline: past26Hours,
        status: "Pending",
        escalationLevel: 0,
      },
    ]);

    (db.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (db.notification.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const summary = await checkAndEscalateOverdueTasks();

    expect(summary).toBeDefined();
    expect(summary.checkedCount).toBe(2);
    expect(summary.newOverdueCount).toBe(1);
    expect(summary.newEscalatedCount).toBe(1);
    expect(summary.notificationsCreated).toBe(2);

    expect(db.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["task-level-1"] } },
        data: expect.objectContaining({
          status: "Overdue",
          escalationLevel: 1,
        }),
      })
    );

    expect(db.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["task-level-2"] } },
        data: expect.objectContaining({
          status: "Escalated",
          escalationLevel: 2,
        }),
      })
    );
  });
});