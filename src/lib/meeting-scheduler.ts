import { db } from "./db";
import { triggerAIAgent } from "./ai-agent-engine";
import { config } from "./config";
import { sendMeetingReminderEmail, SendReminderEmailParams } from "./email-engine";
import { TaskStatus } from "@prisma/client";

/**
 * Generates a valid Google Meet URL structure (e.g., https://meet.google.com/abc-defg-hij)
 */
export function generateGoogleMeetLink(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
}

let isWorkerRunning = false;

/**
 * Send SLA alert email for tasks approaching deadline
 */
async function sendSLAAlertEmail(taskId: string, daysUntilDeadline: number) {
  if (!config.resendApiKey) return;

  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { meeting: true, assignee: true },
    });

    if (!task) return;

    const params: SendReminderEmailParams = {
      meetingId: task.meeting?.id || "sla-alert",
      meetingTitle: task.meeting?.title || `Task: ${task.title}`,
      scheduledDate: task.deadline,
      googleMeetLink: task.meeting?.agenda || "",
      recipientEmail: task.ownerEmail || `${task.ownerName.toLowerCase().replace(/\s+/g, ".")}@innovexa.com`,
      recipientName: task.ownerName,
      agenda: `SLA Alert: This task is due in ${daysUntilDeadline} day(s)`,
      department: task.department,
    };

    await sendMeetingReminderEmail(params);
    console.log(`[SLA Alert] Sent email for task ${taskId} (due in ${daysUntilDeadline}d)`);
  } catch (err: any) {
    console.error(`[SLA Alert] Failed to send email for task ${taskId}:`, err.message);
  }
}

/**
 * Background Scheduler Worker
 * Periodically checks for scheduled meetings due for bot join, shifts status to "In Progress", and dispatches AI Agent.
 * Also monitors tasks approaching deadline and sends SLA alert emails.
 */
export function startMeetingSchedulerWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  console.log("[MeetingScheduler] Background meeting scheduler worker started.");

  setInterval(async () => {
    try {
      const now = new Date();

      // Check for upcoming meetings
      const dueMeetings = await db.meeting.findMany({
        where: {
          status: "Scheduled",
          scheduledDate: {
            lte: new Date(now.getTime() + 60 * 1000),
          },
        },
      });

      for (const meeting of dueMeetings) {
        console.log(`[MeetingScheduler] Dispatching AI Bot for scheduled meeting '${meeting.title}' (${meeting.id})`);

        await db.meeting.update({
          where: { id: meeting.id },
          data: { status: "In Progress" },
        });

        await triggerAIAgent(meeting.id).catch((err) => {
          console.error(`[MeetingScheduler] Error launching bot for meeting ${meeting.id}:`, err.message);
        });
      }

      // Check for tasks approaching deadline (within 24 hours)
      const upcomingDeadlines = await db.task.findMany({
        where: {
          status: { in: ["Pending", "In_Progress"] as TaskStatus[] },
          deadline: {
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            gte: now,
          },
        },
        include: { meeting: true },
      });

      for (const task of upcomingDeadlines) {
        const hoursUntilDeadline = (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        const daysUntilDeadline = Math.ceil(hoursUntilDeadline / 24);

        console.log(`[SLA Monitor] Task '${task.title}' due in ${daysUntilDeadline} day(s)`);

        if (config.resendApiKey) {
          await sendSLAAlertEmail(task.id, daysUntilDeadline);
        }
      }
    } catch (err: any) {
      console.error("[MeetingScheduler Worker Exception]", err.message);
    }
  }, 30000); // Poll every 30 seconds
}
