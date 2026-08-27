import { sendMeetingReminderEmail, SendReminderEmailParams } from "./email-engine";

export interface ReminderJobPayload extends SendReminderEmailParams {
  jobId: string;
  offsetMinutes: number;
  triggerTime: string;
}

class InMemoryDelayedQueue {
  private jobs = new Map<string, { timer: NodeJS.Timeout; payload: ReminderJobPayload }>();

  schedule(payload: ReminderJobPayload, delayMs: number) {
    // Clear any existing job with the same jobId
    if (this.jobs.has(payload.jobId)) {
      clearTimeout(this.jobs.get(payload.jobId)!.timer);
    }

    const timer = setTimeout(async () => {
      console.log(`[NotificationQueue] Executing delayed reminder job ${payload.jobId} for ${payload.recipientEmail}`);
      try {
        await sendMeetingReminderEmail(payload);
      } catch (err: any) {
        console.error(`[NotificationQueue Job Failure ${payload.jobId}]`, err.message);
      } finally {
        this.jobs.delete(payload.jobId);
      }
    }, Math.max(0, delayMs));

    this.jobs.set(payload.jobId, { timer, payload });
    console.log(`[NotificationQueue] Job ${payload.jobId} enqueued (Delay: ${Math.round(delayMs / 1000)}s, Trigger: ${payload.triggerTime})`);
  }

  cancel(jobId: string): boolean {
    if (this.jobs.has(jobId)) {
      clearTimeout(this.jobs.get(jobId)!.timer);
      this.jobs.delete(jobId);
      return true;
    }
    return false;
  }

  getPendingJobs(): ReminderJobPayload[] {
    return Array.from(this.jobs.values()).map((j) => j.payload);
  }
}

const memoryQueue = new InMemoryDelayedQueue();

/**
 * Enqueues a pre-meeting email reminder job to fire X minutes prior to scheduledDate.
 */
export async function enqueuePreMeetingReminder(
  params: SendReminderEmailParams,
  offsetMinutes = 15
) {
  const scheduledTime = new Date(params.scheduledDate).getTime();
  const triggerTimeMs = scheduledTime - offsetMinutes * 60 * 1000;
  const delayMs = Math.max(0, triggerTimeMs - Date.now());

  const jobId = `reminder_${params.meetingId}_${offsetMinutes}m`;
  const payload: ReminderJobPayload = {
    ...params,
    jobId,
    offsetMinutes,
    triggerTime: new Date(triggerTimeMs).toISOString(),
  };

  memoryQueue.schedule(payload, delayMs);

  return {
    enqueued: true,
    jobId,
    delayMs,
    delaySeconds: Math.round(delayMs / 1000),
    triggerTime: payload.triggerTime,
  };
}

/**
 * Cancels a pending pre-meeting reminder job.
 */
export function cancelPreMeetingReminder(meetingId: string, offsetMinutes = 15): boolean {
  const jobId = `reminder_${meetingId}_${offsetMinutes}m`;
  return memoryQueue.cancel(jobId);
}

/**
 * Returns active pending notification jobs.
 */
export function getNotificationQueueStatus() {
  const pending = memoryQueue.getPendingJobs();
  return {
    queueLength: pending.length,
    jobs: pending,
  };
}
