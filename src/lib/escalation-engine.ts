import { db } from "./db";
import { TaskStatus } from "@prisma/client";
import { sendSLAEscalationEmail } from "./email-engine";

export interface EscalationCheckSummary {
  checkedCount: number;
  newOverdueCount: number;
  newEscalatedCount: number;
  notificationsCreated: number;
  newNotifications: any[];
}

/**
 * SLA Escalation Engine: High-Performance batch audit of tasks against deadline timestamps,
 * updates task statuses in batch, dispatches email alerts, and logs escalation records.
 */
export async function checkAndEscalateOverdueTasks(): Promise<EscalationCheckSummary> {
  const now = new Date();
  let newOverdueCount = 0;
  let newEscalatedCount = 0;
  let notificationsCreated = 0;
  const newNotifications: any[] = [];

  // 1. Fetch active pending / in-progress tasks
  const activeTasks = await db.task.findMany({
    where: {
      status: { in: [TaskStatus.Pending, TaskStatus.In_Progress, TaskStatus.Overdue] },
    },
  });

  const level1TaskIds: string[] = [];
  const level1NotifsData: any[] = [];

  const level2TaskIds: string[] = [];
  const level2NotifsData: any[] = [];

  // Fetch departments for manager lookup
  const departments = await db.department.findMany();
  const deptManagerMap = new Map<string, string>();
  departments.forEach((d) => {
    deptManagerMap.set(d.name, `${d.managerName} (${d.code} Dept Head)`);
  });

  for (const task of activeTasks) {
    const isPastDeadline = task.deadline < now;
    const hoursOverdue = (now.getTime() - task.deadline.getTime()) / (1000 * 60 * 60);

    // Rule 1: Deadline passed & Level 0 -> Mark as Overdue
    if (isPastDeadline && task.escalationLevel === 0) {
      level1TaskIds.push(task.id);
      const recipientEmail = task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`;
      
      level1NotifsData.push({
        taskId: task.id,
        recipient: recipientEmail,
        subject: `⚠️ Task Overdue: ${task.title}`,
        body: `Your action item '${task.title}' was due on ${task.deadline.toLocaleDateString()}. Please complete or update status immediately.`,
        type: "Warning",
      });

      // Dispatch automated SLA warning email
      sendSLAEscalationEmail({
        taskId: task.id,
        taskTitle: task.title,
        ownerName: task.ownerName,
        ownerEmail: task.ownerEmail || undefined,
        recipientEmail,
        recipientName: task.ownerName,
        department: task.department,
        priority: task.priority,
        type: "Warning",
        hoursOverdue: Math.max(0.1, hoursOverdue),
        deadline: task.deadline,
      }).catch((e) => console.warn("[SLA Warning Email Dispatch Note]", e.message));
    }
    // Rule 2: Overdue by > 24 hours & Level 1 -> Mark as Escalated
    else if (hoursOverdue >= 24 && task.escalationLevel <= 1) {
      const managerName = deptManagerMap.get(task.department) || "Department Lead";
      const managerEmail = `manager.${task.department.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`;
      level2TaskIds.push(task.id);

      level2NotifsData.push({
        taskId: task.id,
        recipient: managerEmail,
        subject: `🚨 SLA Escalation Alert: ${task.title}`,
        body: `Action item '${task.title}' owned by ${task.ownerName} is ${Math.floor(hoursOverdue)} hours overdue. Escalated to ${managerName}.`,
        type: "Escalation",
      });

      // Dispatch automated SLA manager escalation email
      sendSLAEscalationEmail({
        taskId: task.id,
        taskTitle: task.title,
        ownerName: task.ownerName,
        ownerEmail: task.ownerEmail || undefined,
        recipientEmail: managerEmail,
        recipientName: managerName,
        department: task.department,
        priority: task.priority,
        type: "Escalation",
        hoursOverdue,
        deadline: task.deadline,
      }).catch((e) => console.warn("[SLA Escalation Email Dispatch Note]", e.message));
    }
  }

  // Batch update Level 1 (Overdue)
  if (level1TaskIds.length > 0) {
    await db.task.updateMany({
      where: { id: { in: level1TaskIds } },
      data: {
        status: TaskStatus.Overdue,
        escalationLevel: 1,
      },
    });
    await db.notification.createMany({ data: level1NotifsData });
    newOverdueCount += level1TaskIds.length;
    notificationsCreated += level1NotifsData.length;
    newNotifications.push(...level1NotifsData);
  }

  // Batch update Level 2 (Escalated)
  if (level2TaskIds.length > 0) {
    await db.task.updateMany({
      where: { id: { in: level2TaskIds } },
      data: {
        status: TaskStatus.Escalated,
        escalationLevel: 2,
        escalatedAt: now,
      },
    });
    await db.notification.createMany({ data: level2NotifsData });
    newEscalatedCount += level2TaskIds.length;
    notificationsCreated += level2NotifsData.length;
    newNotifications.push(...level2NotifsData);
  }

  return {
    checkedCount: activeTasks.length,
    newOverdueCount,
    newEscalatedCount,
    notificationsCreated,
    newNotifications,
  };
}
