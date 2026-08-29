import { db } from "./db";
import { config } from "./config";
import { TaskStatus } from "@prisma/client";
import { generateSLAEmailHtml, sendEmailViaResend } from "./sla-email-templates";

/**
 * SLA Alert Types
 */
export type SLAAlertType = "DEADLINE_APPROACHING" | "TASK_OVERDUE" | "TASK_ESCALATED";

export interface SLAAlertSummary {
  approachingCount: number;
  overdueCount: number;
  escalatedCount: number;
  notificationsCreated: number;
  emailsSent: number;
  errors: string[];
  timestamp: string;
}

export interface SLAEmailParams {
  alertType: SLAAlertType;
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  ownerName: string;
  ownerEmail: string;
  department: string;
  priority: string;
  deadline: Date;
  hoursUntilDeadline?: number;
  hoursOverdue?: number;
  escalationLevel?: number;
  meetingTitle?: string | null;
  meetingId?: string | null;
}

/**
 * Checks if a notification for a task+alertType has been sent recently to prevent spam
 */
async function hasRecentNotification(
  taskId: string,
  alertType: SLAAlertType,
  withinHours: number = 12
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const existing = await db.notification.findFirst({
    where: {
      taskId,
      type: alertType,
      sentAt: { gte: cutoff },
    },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Build notification subject and body for an SLA alert
 */
function buildNotificationContent(
  alertType: SLAAlertType,
  taskTitle: string,
  ownerName: string,
  hoursUntilDeadline?: number,
  hoursOverdue?: number,
  escalationLevel?: number,
  deadline?: Date
): { subject: string; body: string } {
  switch (alertType) {
    case "DEADLINE_APPROACHING":
      return {
        subject: `⏰ Deadline Approaching: ${taskTitle}`,
        body: `Task "${taskTitle}" assigned to ${ownerName} is due in ${hoursUntilDeadline ?? "<24"} hours (${deadline?.toLocaleString() ?? "soon"}). Please complete or update status.`,
      };
    case "TASK_OVERDUE":
      return {
        subject: `🚨 Task Overdue: ${taskTitle}`,
        body: `Task "${taskTitle}" assigned to ${ownerName} is now ${Math.floor(hoursOverdue ?? 0)} hours overdue (was due ${deadline?.toLocaleString() ?? ""}). Immediate action required.`,
      };
    case "TASK_ESCALATED":
      return {
        subject: `⚠️ Task Escalated (Level ${escalationLevel ?? 2}): ${taskTitle}`,
        body: `Task "${taskTitle}" assigned to ${ownerName} has been escalated to management (Level ${escalationLevel ?? 2}) after ${Math.floor(hoursOverdue ?? 0)} hours overdue. Manager oversight now required.`,
      };
  }
}

/**
 * Send an email for an SLA alert using the configured email service
 */
async function dispatchSLAEmail(params: SLAEmailParams): Promise<boolean> {
  if (!params.ownerEmail || !params.ownerEmail.includes("@")) {
    console.log(`[SLA Monitor] Skipping email for task ${params.taskId}: no valid owner email`);
    return false;
  }

  try {
    const html = generateSLAEmailHtml({
      alertType: params.alertType,
      taskTitle: params.taskTitle,
      taskDescription: params.taskDescription ?? undefined,
      assigneeName: params.ownerName,
      deadline: params.deadline,
      hoursUntilDeadline: params.hoursUntilDeadline,
      hoursOverdue: params.hoursOverdue,
      escalationLevel: params.escalationLevel,
      meetingTitle: params.meetingTitle ?? undefined,
      meetingId: params.meetingId ?? undefined,
      taskId: params.taskId,
      department: params.department,
      priority: params.priority,
    });

    const subjectMap: Record<SLAAlertType, string> = {
      DEADLINE_APPROACHING: `⏰ SLA Deadline Approaching: ${params.taskTitle}`,
      TASK_OVERDUE: `🚨 SLA Task Overdue: ${params.taskTitle}`,
      TASK_ESCALATED: `⚠️ SLA Escalation: ${params.taskTitle}`,
    };

    const result = await sendEmailViaResend({
      from: config.emailFrom,
      to: [params.ownerEmail],
      subject: subjectMap[params.alertType],
      html,
    });

    if (result.delivered) {
      console.log(`[SLA Monitor] Email sent: ${params.alertType} → ${params.ownerEmail} for task ${params.taskId} (${result.messageId})`);
    } else {
      console.warn(`[SLA Monitor] Email not delivered for task ${params.taskId} — logged as notification only`);
    }

    return result.delivered;
  } catch (error: unknown) {
    console.error(`[SLA Monitor] Email dispatch failed for task ${params.taskId}:`, error);
    return false;
  }
}

/**
 * Main SLA monitoring function: detects approaching, overdue, and escalated tasks,
 * creates in-app notifications, and sends email alerts.
 */
export async function runSLAMonitorCycle(): Promise<SLAAlertSummary> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const errors: string[] = [];

  let approachingCount = 0;
  let overdueCount = 0;
  let escalatedCount = 0;
  let notificationsCreated = 0;
  let emailsSent = 0;

  console.log(`[SLA Monitor] Cycle started at ${now.toISOString()}`);

  // ── 1. APPROACHING: Tasks due within 24h, not completed, not already notified ──
  try {
    const approachingTasks = await db.task.findMany({
      where: {
        status: { in: [TaskStatus.Pending, TaskStatus.In_Progress] },
        deadline: {
          gte: now,
          lte: in24Hours,
        },
      },
      include: {
        meeting: { select: { id: true, title: true } },
      },
      take: 100,
    });

    for (const task of approachingTasks) {
      const alreadyNotified = await hasRecentNotification(task.id, "DEADLINE_APPROACHING", 12);
      if (alreadyNotified) continue;

      const hoursUntil = Math.max(1, Math.ceil((task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
      const { subject, body } = buildNotificationContent(
        "DEADLINE_APPROACHING",
        task.title,
        task.ownerName,
        hoursUntil,
        undefined,
        undefined,
        task.deadline
      );

      try {
        await db.notification.create({
          data: {
            taskId: task.id,
            recipient: task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`,
            subject,
            body,
            type: "DEADLINE_APPROACHING",
            read: false,
          },
        });
        notificationsCreated++;
        approachingCount++;
      } catch (e) {
        errors.push(`approaching-notif-${task.id}: ${(e as Error).message}`);
      }

      const emailSent = await dispatchSLAEmail({
        alertType: "DEADLINE_APPROACHING",
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description,
        ownerName: task.ownerName,
        ownerEmail: task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`,
        department: task.department,
        priority: task.priority,
        deadline: task.deadline,
        hoursUntilDeadline: hoursUntil,
        meetingTitle: task.meeting?.title ?? null,
        meetingId: task.meetingId,
      });
      if (emailSent) emailsSent++;
    }
  } catch (e) {
    errors.push(`approaching-phase: ${(e as Error).message}`);
  }

  // ── 2. OVERDUE: Tasks past deadline, still Pending/In_Progress, need Level 1 escalation ──
  try {
    const overdueTasks = await db.task.findMany({
      where: {
        status: { in: [TaskStatus.Pending, TaskStatus.In_Progress] },
        deadline: { lt: now },
        escalationLevel: 0,
      },
      include: {
        meeting: { select: { id: true, title: true } },
      },
      take: 100,
    });

    for (const task of overdueTasks) {
      const alreadyNotified = await hasRecentNotification(task.id, "TASK_OVERDUE", 24);
      const hoursOverdue = (now.getTime() - task.deadline.getTime()) / (1000 * 60 * 60);

      // Update task to Overdue (Level 1)
      try {
        await db.task.update({
          where: { id: task.id },
          data: {
            status: TaskStatus.Overdue,
            escalationLevel: 1,
          },
        });
      } catch (e) {
        errors.push(`overdue-update-${task.id}: ${(e as Error).message}`);
        continue;
      }

      if (!alreadyNotified) {
        const { subject, body } = buildNotificationContent(
          "TASK_OVERDUE",
          task.title,
          task.ownerName,
          undefined,
          hoursOverdue,
          1,
          task.deadline
        );

        try {
          await db.notification.create({
            data: {
              taskId: task.id,
              recipient: task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`,
              subject,
              body,
              type: "TASK_OVERDUE",
              read: false,
            },
          });
          notificationsCreated++;
        } catch (e) {
          errors.push(`overdue-notif-${task.id}: ${(e as Error).message}`);
        }

        const emailSent = await dispatchSLAEmail({
          alertType: "TASK_OVERDUE",
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          ownerName: task.ownerName,
          ownerEmail: task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`,
          department: task.department,
          priority: task.priority,
          deadline: task.deadline,
          hoursOverdue,
          meetingTitle: task.meeting?.title ?? null,
          meetingId: task.meetingId,
        });
        if (emailSent) emailsSent++;
      }

      overdueCount++;
    }
  } catch (e) {
    errors.push(`overdue-phase: ${(e as Error).message}`);
  }

  // ── 3. ESCALATED: Tasks overdue >24h, Level 1 only, need Level 2 escalation to manager ──
  try {
    const escalateTasks = await db.task.findMany({
      where: {
        status: TaskStatus.Overdue,
        escalationLevel: 1,
        deadline: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      include: {
        meeting: { select: { id: true, title: true } },
      },
      take: 100,
    });

    for (const task of escalateTasks) {
      const alreadyNotified = await hasRecentNotification(task.id, "TASK_ESCALATED", 24);
      const hoursOverdue = (now.getTime() - task.deadline.getTime()) / (1000 * 60 * 60);

      // Find the department manager
      const department = await db.department.findFirst({
        where: { name: task.department },
        select: { managerName: true, managerEmail: true },
      });

      const managerEmail = department?.managerEmail ||
        `manager.${task.department.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`;
      const managerName = department?.managerName || `${task.department} Lead`;

      // Update task to Escalated (Level 2)
      try {
        await db.task.update({
          where: { id: task.id },
          data: {
            status: TaskStatus.Escalated,
            escalationLevel: 2,
            escalatedAt: now,
            escalatedTo: managerEmail,
          },
        });
      } catch (e) {
        errors.push(`escalate-update-${task.id}: ${(e as Error).message}`);
        continue;
      }

      if (!alreadyNotified) {
        const { subject, body } = buildNotificationContent(
          "TASK_ESCALATED",
          task.title,
          task.ownerName,
          undefined,
          hoursOverdue,
          2,
          task.deadline
        );

        // Notify both the owner AND the manager
        try {
          await db.notification.createMany({
            data: [
              {
                taskId: task.id,
                recipient: task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`,
                subject,
                body,
                type: "TASK_ESCALATED",
                read: false,
              },
              {
                taskId: task.id,
                recipient: managerEmail,
                subject: `[MANAGER] ${subject}`,
                body: body.replace(`${task.ownerName}`, `${task.ownerName} → Escalated to you (${managerName})`),
                type: "TASK_ESCALATED",
                read: false,
              },
            ],
          });
          notificationsCreated += 2;
        } catch (e) {
          errors.push(`escalate-notif-${task.id}: ${(e as Error).message}`);
        }

        // Send email to owner
        const ownerEmailSent = await dispatchSLAEmail({
          alertType: "TASK_ESCALATED",
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          ownerName: task.ownerName,
          ownerEmail: task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`,
          department: task.department,
          priority: task.priority,
          deadline: task.deadline,
          hoursOverdue,
          escalationLevel: 2,
          meetingTitle: task.meeting?.title ?? null,
          meetingId: task.meetingId,
        });
        if (ownerEmailSent) emailsSent++;

        // Send escalation email to manager
        const managerEmailSent = await dispatchSLAEmail({
          alertType: "TASK_ESCALATED",
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          ownerName: `${task.ownerName} → ${managerName}`,
          ownerEmail: managerEmail,
          department: task.department,
          priority: task.priority,
          deadline: task.deadline,
          hoursOverdue,
          escalationLevel: 2,
          meetingTitle: task.meeting?.title ?? null,
          meetingId: task.meetingId,
        });
        if (managerEmailSent) emailsSent++;
      }

      escalatedCount++;
    }
  } catch (e) {
    errors.push(`escalate-phase: ${(e as Error).message}`);
  }

  const summary: SLAAlertSummary = {
    approachingCount,
    overdueCount,
    escalatedCount,
    notificationsCreated,
    emailsSent,
    errors,
    timestamp: now.toISOString(),
  };

  console.log(
    `[SLA Monitor] Cycle complete: ${approachingCount} approaching, ${overdueCount} overdue, ${escalatedCount} escalated | ${notificationsCreated} notifications, ${emailsSent} emails | ${errors.length} errors`
  );

  return summary;
}
