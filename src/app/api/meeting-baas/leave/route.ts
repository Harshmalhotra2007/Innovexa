import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

function extractMeetCode(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Dedicated MeetingBaas Direct Instant Bot Leave Route
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingId, meetingUrl, apiKey } = body;

    const baasApiKey = config.meetingBaasApiKey;

    const meeting = meetingId ? await db.meeting.findUnique({ where: { id: meetingId } }) : null;
    const targetUrl = meetingUrl || (meeting?.agenda && meeting.agenda.includes("meet.google.com") ? meeting.agenda : null);
    const meetCode = extractMeetCode(targetUrl);

    console.log(`[MeetingBaas Direct Leave] Triggering instant leave for target URL: ${targetUrl || "all active"}`);

    // 1. Direct Render Cloud Bot Leave
    fetch(`${RENDER_BOT_URL}/bot/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingUrl: targetUrl }),
    }).catch(() => {});

    // 2. Fetch all active bots from MeetingBaas API
    const listRes = await fetch("https://api.meetingbaas.com/v2/bots", {
      headers: { "x-meeting-baas-api-key": baasApiKey },
    });

    let disconnectedBots: string[] = [];

    if (listRes.ok) {
      const listData = await listRes.json();
      const botsList: any[] = listData.data || [];

      const activeBots = botsList.filter((b) => {
        if (b.status === "completed" || b.status === "failed") return false;
        if (meetCode && b.meeting_url && b.meeting_url.toLowerCase().includes(meetCode)) return true;
        if (targetUrl && b.meeting_url && (targetUrl.includes(b.meeting_url) || b.meeting_url.includes(targetUrl))) return true;
        // Global fail-safe fallback: eject any non-completed bot
        return true;
      });

      for (const b of activeBots) {
        console.log(`[MeetingBaas Direct Leave] Sending leave payload to bot ID: ${b.bot_id}`);
        const leaveRes = await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
          method: "POST",
          headers: {
            "x-meeting-baas-api-key": baasApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }).catch((e) => console.warn("Leave error:", e));

        if (leaveRes && leaveRes.ok) {
          disconnectedBots.push(b.bot_id);
        }
      }
    }

    if (meetingId) {
      await db.aIAgent.upsert({
        where: { meetingId },
        create: {
          meetingId,
          status: "completed",
          summary: "Meeting ended by organizer. Audio & video recording saved.",
        },
        update: {
          status: "completed",
          summary: "Meeting ended by organizer. Audio & video recording saved.",
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Direct leave dispatched to ${disconnectedBots.length} active bot(s).`,
      disconnectedBots,
    });
  } catch (error: any) {
    console.error("[MeetingBaas Direct Leave] Exception:", error);
    return NextResponse.json(
      { error: error.message || "Failed to leave MeetingBaas bot" },
      { status: 500 }
    );
  }
}
