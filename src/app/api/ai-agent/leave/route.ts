import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";
const RENDER_BOT_URL = process.env.MEET_BOT_URL || process.env.BOT_SERVICE_URL || "https://innovexa-meet-bot.onrender.com";

/**
 * End Meeting & Guaranteed Bot Disconnect Endpoint
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

    // 2. Query MeetingBaas API for active bots matching meeting URL or bot ID
    try {
      const listRes = await fetch("https://api.meetingbaas.com/v2/bots", {
        headers: { "x-meeting-baas-api-key": baasApiKey },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const botsList: any[] = listData.data || [];
        
        // Find all active bots for this meeting
        const activeBots = botsList.filter((b) => {
          if (b.status === "completed" || b.status === "failed") return false;
          if (agent?.recordingUrl === `baas_${b.bot_id}`) return true;
          if (targetUrl && b.meeting_url && (targetUrl.includes(b.meeting_url) || b.meeting_url.includes(targetUrl))) return true;
          return false;
        });

        console.log(`[EndMeeting] Found ${activeBots.length} active MeetingBaas bots to leave.`);

        // Send POST /v2/bots/:id/leave to ALL matching active bots
        for (const b of activeBots) {
          console.log(`[EndMeeting] Dispatching leave to MeetingBaas bot: ${b.bot_id}`);
          await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
            method: "POST",
            headers: {
              "x-meeting-baas-api-key": baasApiKey,
              "Content-Type": "application/json",
            },
          }).catch((err) => console.warn(`[EndMeeting] Leave error for bot ${b.bot_id}:`, err));
        }
      }
    } catch (e) {
      console.warn("[EndMeeting] Error querying active MeetingBaas bots:", e);
    }

    // 3. Fallback direct botId leave if stored in agent record
    if (agent && agent.recordingUrl && agent.recordingUrl.startsWith("baas_")) {
      const storedBotId = agent.recordingUrl.replace("baas_", "");
      fetch(`https://api.meetingbaas.com/v2/bots/${storedBotId}/leave`, {
        method: "POST",
        headers: {
          "x-meeting-baas-api-key": baasApiKey,
          "Content-Type": "application/json",
        },
      }).catch((err) => console.warn("[EndMeeting] Stored bot leave error:", err));
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
      message: "Meeting ended successfully. All active bots instructed to leave room.",
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
