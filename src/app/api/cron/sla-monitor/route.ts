import { NextResponse } from "next/server";
import { runSLAMonitorCycle, SLAAlertSummary } from "@/lib/sla-monitor";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron endpoint for SLA monitoring
 *
 * This endpoint is designed to be called by Vercel Cron on a schedule (e.g., every 15 minutes).
 * It runs the full SLA monitoring cycle which:
 * 1. Checks for tasks approaching deadline (within 24h) → DEADLINE_APPROACHING alerts
 * 2. Checks for overdue tasks needing Level 1 escalation → TASK_OVERDUE alerts
 * 3. Checks for tasks overdue >24h needing Level 2 escalation → TASK_ESCALATED alerts
 *
 * Authentication: Uses CRON_SECRET for verification (configured in Vercel)
 *
 * @returns SLAAlertSummary with counts and any errors
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  // Verify cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && cronSecret.trim().length > 0) {
    // Support both "Bearer <secret>" and direct secret
    const providedSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (providedSecret !== cronSecret) {
      console.warn("[SLA Cron] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }
  }

  try {
    console.log("[SLA Cron] Starting SLA monitor cycle...");
    const summary: SLAAlertSummary = await runSLAMonitorCycle();
    const durationMs = Date.now() - startTime;

    console.log(
      `[SLA Cron] Completed in ${durationMs}ms: ` +
      `${summary.approachingCount} approaching, ${summary.overdueCount} overdue, ${summary.escalatedCount} escalated | ` +
      `${summary.notificationsCreated} notifications, ${summary.emailsSent} emails | ${summary.errors.length} errors`
    );

    return NextResponse.json({
      success: true,
      summary: {
        ...summary,
        durationMs,
      },
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("[SLA Cron] Fatal error:", error);

    return NextResponse.json({
      success: false,
      error: message,
      summary: {
        approachingCount: 0,
        overdueCount: 0,
        escalatedCount: 0,
        notificationsCreated: 0,
        emailsSent: 0,
        errors: [message],
        timestamp: new Date().toISOString(),
        durationMs,
      } as SLAAlertSummary,
    }, { status: 500 });
  }
}

/**
 * Manual trigger endpoint for testing (POST)
 * Allows manual invocation with optional parameters
 */
export async function POST(req: Request) {
  const startTime = Date.now();

  // Same auth check
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && cronSecret.trim().length > 0) {
    const providedSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { force = false, taskId } = body;

    console.log("[SLA Cron] Manual trigger:", { force, taskId });

    // If force=true and taskId provided, could add targeted check here
    // For now, just run full cycle
    const summary = await runSLAMonitorCycle();
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      summary: {
        ...summary,
        durationMs,
      },
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("[SLA Cron] Manual trigger error:", error);

    return NextResponse.json({
      success: false,
      error: message,
      summary: {
        approachingCount: 0,
        overdueCount: 0,
        escalatedCount: 0,
        notificationsCreated: 0,
        emailsSent: 0,
        errors: [message],
        timestamp: new Date().toISOString(),
        durationMs,
      } as SLAAlertSummary,
    }, { status: 500 });
  }
}