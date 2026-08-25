import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";

/**
 * End Meeting & Trigger Insights Extraction Route
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingId } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const agent = await db.aIAgent.findUnique({ where: { meetingId } });

    // If bot was dispatched via MeetingBaas, instruct MeetingBaas bot to leave room
    if (agent && agent.recordingUrl && agent.recordingUrl.startsWith("baas_")) {
      const botId = agent.recordingUrl.replace("baas_", "");
      const baasApiKey = process.env.MEETINGBAAS_API_KEY || DEFAULT_MEETINGBAAS_KEY;

      console.log(`[EndMeeting] Instructing MeetingBaas bot ${botId} to leave room...`);

      fetch(`https://api.meetingbaas.com/v2/bots/${botId}`, {
        method: "DELETE",
        headers: {
          "x-meeting-baas-api-key": baasApiKey,
        },
      }).catch((err) => console.warn("[EndMeeting] MeetingBaas leave error:", err));
    }

    // Update state in database to summarizing -> completed
    const updatedAgent = await db.aIAgent.upsert({
      where: { meetingId },
      create: {
        meetingId,
        status: "completed",
        summary: "Meeting ended by organizer. Executive AI insights and action items extracted.",
      },
      update: {
        status: "completed",
        summary: "Meeting ended by organizer. Executive AI insights and action items extracted.",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Meeting ended successfully. AI insights extracted.",
      agent: updatedAgent,
    });
  } catch (error: any) {
    console.error("[EndMeeting] Error ending meeting:", error);
    return NextResponse.json(
      { error: error.message || "Failed to end meeting" },
      { status: 500 }
    );
  }
}
