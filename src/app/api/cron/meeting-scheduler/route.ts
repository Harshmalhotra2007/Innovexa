import { NextResponse } from "next/server";
import { processSchedulerTick, getSchedulerStatus } from "@/lib/meeting-scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tickResult = await processSchedulerTick();
    const status = getSchedulerStatus();
    return NextResponse.json({
      status: "success",
      workerStatus: status,
      tickResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to process scheduler tick" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
