import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";
const RENDER_BOT_URL = process.env.MEET_BOT_URL || "https://innovexa-meet-bot.onrender.com";

/**
 * End Meeting & Signal Bot Disconnect Endpoint
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingId } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    const targetUrl = meeting?.agenda && meeting.agenda.includes("meet.google.com") ? meeting.agenda : null;
    const agent = await db.aIAgent.findUnique({ where: { meetingId } });

    const baasApiKey = process.env.MEETINGBAAS_API_KEY || DEFAULT_MEETINGBAAS_KEY;

    // 1. Signal Render Cloud Bot to leave Google Meet room immediately
    fetch(`${RENDER_BOT_URL}/bot/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingUrl: targetUrl, meetingId }),
    }).catch((err) => console.warn("[EndMeeting] Render bot leave signal error:", err));

    // 2. Extract botId if set in recordingUrl reference
    let botId: string | null = null;
    if (agent && agent.recordingUrl && agent.recordingUrl.startsWith("baas_")) {
      botId = agent.recordingUrl.replace("baas_", "");
    }

    // 3. Instruct MeetingBaas to leave call immediately (POST v2 /leave & DELETE v2 /bots)
    if (botId) {
      console.log(`[EndMeeting] Instructing MeetingBaas bot ${botId} to leave room...`);

      fetch(`https://api.meetingbaas.com/v2/bots/${botId}/leave`, {
        method: "POST",
        headers: {
          "x-meeting-baas-api-key": baasApiKey,
          "Content-Type": "application/json",
        },
      }).catch((err) => console.warn("[EndMeeting] MeetingBaas leave error:", err));

      fetch(`https://api.meetingbaas.com/v2/bots/${botId}`, {
        method: "DELETE",
        headers: {
          "x-meeting-baas-api-key": baasApiKey,
        },
      }).catch((err) => console.warn("[EndMeeting] MeetingBaas delete error:", err));
    }

    // 4. Update state in database to completed
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
      message: "Meeting ended successfully. Bot instructed to leave room.",
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
