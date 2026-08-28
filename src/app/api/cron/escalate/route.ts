import { NextResponse } from "next/server";
import { checkAndEscalateOverdueTasks } from "@/lib/escalation-engine";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || config.cronSecret;
  if (!cronSecret) {
    return true;
  }
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET" }, { status: 401 });
  }

  try {
    const summary = await checkAndEscalateOverdueTasks();

    // Fetch latest notification alerts for real-time header sync
    const notifications = await db.notification.findMany({
      orderBy: { sentAt: "desc" },
      take: 10,
      include: {
        task: { select: { id: true, title: true, department: true } },
      },
    });

    const events = notifications.map((n) => ({
      id: n.id,
      text: `${n.subject} - ${n.body}`,
      date: n.sentAt,
      read: n.read,
      type: n.type,
    }));

    return NextResponse.json({
      success: true,
      processedCount: summary.checkedCount,
      summary,
      events,
    });
  } catch (error: unknown) {
    console.error("[Cron Escalate POST Error]", error);
    const message = error instanceof Error ? error.message : "Failed to execute escalation audit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET" }, { status: 401 });
  }

  try {
    const summary = await checkAndEscalateOverdueTasks();

    const notifications = await db.notification.findMany({
      orderBy: { sentAt: "desc" },
      take: 10,
      include: {
        task: { select: { id: true, title: true, department: true } },
      },
    });

    const events = notifications.map((n) => ({
      id: n.id,
      text: `${n.subject} - ${n.body}`,
      date: n.sentAt,
      read: n.read,
      type: n.type,
    }));

    return NextResponse.json({
      success: true,
      processedCount: summary.checkedCount,
      summary,
      events,
    });
  } catch (error: unknown) {
    console.error("[Cron Escalate GET Error]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch escalation events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
