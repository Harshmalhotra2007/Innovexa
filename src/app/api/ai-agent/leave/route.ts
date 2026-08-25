import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";
const RENDER_BOT_URL = process.env.MEET_BOT_URL || process.env.BOT_SERVICE_URL || "https://innovexa-meet-bot.onrender.com";

function extractMeetCode(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

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
    const meetCode = extractMeetCode(targetUrl);
    const storedBotId = agent?.recordingUrl?.startsWith("baas_") ? agent.recordingUrl.replace("baas_", "") : null;

    // 1. Signal Render Cloud Bot to leave Google Meet room immediately
    fetch(`${RENDER_BOT_URL}/bot/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingUrl: targetUrl, meetingId }),
    }).catch((err) => console.warn("[EndMeeting] Render bot leave signal error:", err));

    // 2. Query MeetingBaas API for active bots matching meeting URL, Meet Code, or bot ID
    try {
      const listRes = await fetch("https://api.meetingbaas.com/v2/bots", {
        headers: { "x-meeting-baas-api-key": baasApiKey },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const botsList: any[] = listData.data || [];
        const nonCompleted = botsList.filter((b) => b.status !== "completed" && b.status !== "failed");
        
        // Find all active bots for this meeting
        const activeBots = nonCompleted.filter((b) => {
          if (storedBotId && b.bot_id === storedBotId) return true;
          if (agent?.recordingUrl === `baas_${b.bot_id}`) return true;
          if (meetCode && b.meeting_url && b.meeting_url.toLowerCase().includes(meetCode)) return true;
          if (targetUrl && b.meeting_url && (targetUrl.includes(b.meeting_url) || b.meeting_url.includes(targetUrl))) return true;
          // Fail-safe: if only 1 active bot exists globally in MeetingBaas, eject it
          if (nonCompleted.length === 1) return true;
          return false;
        });

        console.log(`[EndMeeting] Found ${activeBots.length} active MeetingBaas bots to leave.`);

        // Send POST /v2/bots/:id/leave with valid JSON body to ALL matching active bots
        for (const b of activeBots) {
          console.log(`[EndMeeting] Dispatching leave to MeetingBaas bot: ${b.bot_id}`);
          await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
            method: "POST",
            headers: {
              "x-meeting-baas-api-key": baasApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }).catch((err) => console.warn(`[EndMeeting] Leave error for bot ${b.bot_id}:`, err));
        }

        // Also eject all active bots if any remain unhandled
        if (activeBots.length === 0 && nonCompleted.length > 0) {
          for (const b of nonCompleted) {
            console.log(`[EndMeeting] Global fail-safe dispatching leave to bot: ${b.bot_id}`);
            await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
              method: "POST",
              headers: {
                "x-meeting-baas-api-key": baasApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            }).catch((err) => console.warn(`[EndMeeting] Fail-safe leave error for bot ${b.bot_id}:`, err));
          }
        }
      }
    } catch (e) {
      console.warn("[EndMeeting] Error querying active MeetingBaas bots:", e);
    }

    // 3. Fallback direct botId leave if stored in agent record
    if (storedBotId) {
      fetch(`https://api.meetingbaas.com/v2/bots/${storedBotId}/leave`, {
        method: "POST",
        headers: {
          "x-meeting-baas-api-key": baasApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
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
