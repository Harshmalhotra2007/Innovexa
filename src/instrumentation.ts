/**
 * Next.js Instrumentation Hook — runs once on server startup.
 * Ensures seed data is loaded exactly once, eliminating the per-request
 * COUNT(*) guard query that previously ran on every API call.
 * Automatically initializes background meeting scheduler worker.
 */
import { config } from "@/lib/config";

export async function register() {
  if (config.nextRuntime === "nodejs") {
    const { ensureSeedData } = await import("./lib/seed-data");
    await ensureSeedData();

    const { startMeetingSchedulerWorker } = await import("./lib/meeting-scheduler");
    startMeetingSchedulerWorker();

    const { startTaskSLAMonitorWorker } = await import("./lib/task-sla-monitor");
    startTaskSLAMonitorWorker();
  }
}
