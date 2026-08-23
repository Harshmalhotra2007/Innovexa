import { db } from "./db";
import { TaskStatus } from "@prisma/client";

export interface EscalationCheckSummary {
  checkedCount: number;
  newOverdueCount: number;
  newEscalatedCount: number;
  notificationsCreated: number;
  newNotifications: any[];
}

/**
 * SLA Escalation Engine: Automatically audits tasks against deadline timestamps,
 * updates task statuses, and logs escalation alerts to Department Managers.
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

  for (const task of activeTasks) {
    const isPastDeadline = task.deadline < now;
    const hoursOverdue = (now.getTime() - task.deadline.getTime()) / (1000 * 60 * 60);

    // Rule 1: Deadline passed & Level 0 -> Mark as Overdue + Send Warning Notification
    if (isPastDeadline && task.escalationLevel === 0) {
      await db.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.Overdue,
          escalationLevel: 1,
        },
      });
      newOverdueCount++;

      const notif1 = await db.notification.create({
        data: {
          taskId: task.id,
          recipient: task.ownerEmail || task.ownerName,
          subject: `⚠️ Task Overdue: ${task.title}`,
          body: `Your action item '${task.title}' was due on ${task.deadline.toLocaleDateString()}. Please complete or update status immediately.`,
          type: "Warning",
        },
      });
      notificationsCreated++;
      newNotifications.push(notif1 as never);
    }

    // Rule 2: Overdue by > 24 hours & Level 1 -> Mark as Escalated + Notify Department Manager
    else if (hoursOverdue >= 24 && task.escalationLevel <= 1) {
      // Find Department Manager
      const dept = await db.department.findFirst({
        where: { name: task.department },
      });

      const managerName = dept ? `${dept.managerName} (${dept.code} Dept Head)` : "Department Lead";

      await db.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.Escalated,
          escalationLevel: 2,
          escalatedAt: now,
          escalatedTo: managerName,
        },
      });
      newEscalatedCount++;

      const notif2 = await db.notification.create({
        data: {
          taskId: task.id,
          recipient: managerName,
          subject: `🚨 SLA Escalation Alert: ${task.title}`,
          body: `Action item '${task.title}' owned by ${task.ownerName} is ${Math.floor(hoursOverdue)} hours overdue. Escalated to manager oversight.`,
          type: "Escalation",
        },
      });
      notificationsCreated++;
      newNotifications.push(notif2 as never);
    }
  }

  return {
    checkedCount: activeTasks.length,
    newOverdueCount,
    newEscalatedCount,
    notificationsCreated,
    newNotifications,
  };
}
