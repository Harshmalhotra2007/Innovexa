import { db } from "./db";
import { triggerAIAgent } from "./ai-agent-engine";

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
 * Background Scheduler Worker
 * Periodically checks for scheduled meetings due for bot join, shifts status to "In Progress", and dispatches AI Agent.
 */
export function startMeetingSchedulerWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  console.log("[MeetingScheduler] Background meeting scheduler worker started.");

  setInterval(async () => {
    try {
      const now = new Date();
      // Find meetings with status "Scheduled" where scheduledDate <= now + 1 minute
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
        
        // 1. Update meeting status to "In Progress"
        await db.meeting.update({
          where: { id: meeting.id },
          data: { status: "In Progress" },
        });

        // 2. Trigger AI Agent
        await triggerAIAgent(meeting.id).catch((err) => {
          console.error(`[MeetingScheduler] Error launching bot for meeting ${meeting.id}:`, err.message);
        });
      }
    } catch (err: any) {
      console.error("[MeetingScheduler Worker Exception]", err.message);
    }
  }, 30000); // Poll every 30 seconds
}
