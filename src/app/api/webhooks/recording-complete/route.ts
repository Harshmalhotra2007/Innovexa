import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { triggerAIAgent } from "@/lib/ai-agent-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { meetingId, recordingUrl, duration, egressId } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Record the recording file in database
    if (recordingUrl) {
      await db.recording.create({
        data: {
          meetingId,
          url: recordingUrl,
          duration: typeof duration === "number" ? duration : 0,
          size: 0,
          format: "video/mp4",
        },
      });
    }

    // Update meeting status
    await db.meeting.update({
      where: { id: meetingId },
      data: {
        status: "Processing",
      },
    });

    // Trigger AI Agent pipeline
    await triggerAIAgent(meetingId);

    return NextResponse.json({
      success: true,
      message: "Recording registered and AI processing triggered",
      meetingId,
    });
  } catch (error: any) {
    console.error("[POST /api/webhooks/recording-complete] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process recording webhook" },
      { status: 500 }
    );
  }
}
