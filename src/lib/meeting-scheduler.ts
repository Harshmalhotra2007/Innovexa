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
let lastTickTime: Date | null = null;
let lastTickStats = {
  dispatchedMeetings: 0,
  sentReminders: 0,
  slaAlerts: 0,
};

/**
 * Send SLA alert email for tasks approaching deadline
 */
async function sendSLAAlertEmail(taskId: string, daysUntilDeadline: number) {
  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { meeting: true, assignee: true },
    });

    if (!task) return;

    // Check if SLA warning already dispatched in past 24 hours
    const existingNotification = await db.notification.findFirst({
      where: {
        taskId: task.id,
        type: "SLA_WARNING",
        sentAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingNotification) return;

    const recipientEmail = task.ownerEmail || `${task.ownerName.toLowerCase().replace(/\s+/g, ".")}@innovexa.com`;
    const params: SendReminderEmailParams = {
      meetingId: task.meeting?.id || "sla-alert",
      meetingTitle: task.meeting?.title || `Task: ${task.title}`,
      scheduledDate: task.deadline,
      googleMeetLink: task.meeting?.googleMeetLink || "",
      recipientEmail,
      recipientName: task.ownerName,
      agenda: `SLA Alert: Task '${task.title}' is due in ${daysUntilDeadline} day(s) (${task.deadline.toISOString()})`,
      department: task.department,
    };

    await sendMeetingReminderEmail(params);
    await db.notification.create({
      data: {
        taskId: task.id,
        recipient: recipientEmail,
        subject: `⚠️ SLA Alert: Task '${task.title}' due in ${daysUntilDeadline}d`,
        body: `Your assigned task in ${task.department} has an approaching deadline.`,
        type: "SLA_WARNING",
      },
    });

    console.log(`[SLA Alert] Sent email for task ${taskId} (due in ${daysUntilDeadline}d)`);
  } catch (err: any) {
    console.error(`[SLA Alert] Failed to send email for task ${taskId}:`, err.message);
  }
}

/**
 * Executes a single idempotent scheduler worker cycle.
 * Can be called by background timer or on-demand cron endpoint.
 */
export async function processSchedulerTick() {
  const now = new Date();
  lastTickTime = now;
  let dispatchedMeetings = 0;
  let sentReminders = 0;
  let slaAlerts = 0;

  try {
    // 1. Check for meetings due to start (scheduledDate <= NOW + 60s)
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

      dispatchedMeetings++;

      await triggerAIAgent(meeting.id).catch((err) => {
        console.error(`[MeetingScheduler] Error launching bot for meeting ${meeting.id}:`, err.message);
      });
    }

    // 2. Check for upcoming meetings starting within 16 minutes that need pre-meeting reminders
    const upcomingMeetings = await db.meeting.findMany({
      where: {
        status: "Scheduled",
        scheduledDate: {
          gte: now,
          lte: new Date(now.getTime() + 16 * 60 * 1000),
        },
      },
    });

    for (const meet of upcomingMeetings) {
      const subjectPattern = `⏰ Reminder: ${meet.title} starts in 15 mins`;
      const existingReminder = await db.notification.findFirst({
        where: {
          subject: subjectPattern,
          sentAt: {
            gte: new Date(now.getTime() - 30 * 60 * 1000),
          },
        },
      });

      if (!existingReminder) {
        const participantList = meet.participants
          ? meet.participants.split(",").map((p) => p.trim()).filter(Boolean)
          : ["team@innovexa.com"];

        for (const recipient of participantList) {
          const email = recipient.includes("@") ? recipient : `${recipient.toLowerCase().replace(/\s+/g, ".")}@innovexa.com`;
          await sendMeetingReminderEmail({
            meetingId: meet.id,
            meetingTitle: meet.title,
            scheduledDate: meet.scheduledDate || meet.date,
            googleMeetLink: meet.googleMeetLink || "",
            recipientEmail: email,
            agenda: meet.agenda || meet.objectives || undefined,
            department: meet.department || "General",
          });
          sentReminders++;
        }
      }
    }

    // 3. Check for tasks approaching deadline (within 24 hours)
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

      await sendSLAAlertEmail(task.id, daysUntilDeadline);
      slaAlerts++;
    }
  } catch (err: any) {
    console.error("[MeetingScheduler Tick Exception]", err.message);
  }

  lastTickStats = {
    dispatchedMeetings,
    sentReminders,
    slaAlerts,
  };

  return {
    timestamp: now.toISOString(),
    ...lastTickStats,
  };
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

  // Run immediate tick on startup
  processSchedulerTick().catch((e) => console.warn("[Scheduler Init Tick Note]", e.message));

  // Poll every 30 seconds
  setInterval(async () => {
    await processSchedulerTick();
  }, 30000);
}

/**
 * Scheduler worker status and telemetry
 */
export function getSchedulerStatus() {
  return {
    isWorkerRunning,
    lastTickTime: lastTickTime ? lastTickTime.toISOString() : null,
    lastTickStats,
  };
}
