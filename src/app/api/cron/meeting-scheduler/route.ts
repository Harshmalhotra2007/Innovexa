import { NextResponse } from "next/server";
import { processSchedulerTick, getSchedulerStatus } from "@/lib/meeting-scheduler";
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

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET" }, { status: 401 });
  }

  try {
    const tickResult = await processSchedulerTick();
    const status = getSchedulerStatus();
    return NextResponse.json({
      status: "success",
      workerStatus: status,
      tickResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process scheduler tick";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
