import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";

function extractMeetCode(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const meeting = await db.meeting.findUnique({
    where: { id: params.id },
    include: {
      segments: { orderBy: { order: "asc" } },
      decisions: true,
      tasks: { orderBy: { deadline: "asc" } },
      actionItems: true,
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "organizer") {
      return NextResponse.json({ error: "Forbidden: Requester must be an organizer" }, { status: 403 });
    }

    const { id } = params;

    // Fetch meeting first so we have the meetingUrl (stored in agenda field)
    let meeting: any = null;
    try {
      meeting = await db.meeting.findUnique({
        where: { id },
        select: { id: true, agenda: true },
      });
    } catch (e) {
      meeting = null;
    }

    const botServiceUrl = process.env.BOT_SERVICE_URL || process.env.MEET_BOT_URL || "https://innovexa-meet-bot.onrender.com";
    const meetingUrl = meeting?.agenda?.includes("meet.google.com") ? meeting.agenda : null;
    const meetCode = extractMeetCode(meetingUrl);
    const baasApiKey = process.env.MEETINGBAAS_API_KEY || DEFAULT_MEETINGBAAS_KEY;

    // 1. Signal Render Cloud Bot to leave BEFORE deleting the record
    if (meetingUrl) {
      try {
        await fetch(`${botServiceUrl}/bot/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingUrl }),
        });
        console.log("[DELETE] Bot leave signal sent for:", meetingUrl);
      } catch (e) {
        console.warn("[DELETE] Bot leave signal failed (non-blocking):", e);
      }
    }

    // 2. Query MeetingBaas API for active bots matching meeting URL or Meet Code
    try {
      const listRes = await fetch("https://api.meetingbaas.com/v2/bots", {
        headers: { "x-meeting-baas-api-key": baasApiKey },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const botsList: any[] = listData.data || [];
        const nonCompleted = botsList.filter((b) => b.status !== "completed" && b.status !== "failed");
        
        const activeBots = nonCompleted.filter((b) => {
          if (meetCode && b.meeting_url && b.meeting_url.toLowerCase().includes(meetCode)) return true;
          if (meetingUrl && b.meeting_url && (meetingUrl.includes(b.meeting_url) || b.meeting_url.includes(meetingUrl))) return true;
          if (nonCompleted.length === 1) return true;
          return false;
        });

        for (const b of activeBots) {
          console.log(`[DELETE] Dispatching leave to MeetingBaas bot: ${b.bot_id}`);
          await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
            method: "POST",
            headers: {
              "x-meeting-baas-api-key": baasApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }).catch((err) => console.warn(`[DELETE] Leave error for bot ${b.bot_id}:`, err));
        }

        if (activeBots.length === 0 && nonCompleted.length > 0) {
          for (const b of nonCompleted) {
            console.log(`[DELETE] Global fail-safe leave to bot: ${b.bot_id}`);
            await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
              method: "POST",
              headers: {
                "x-meeting-baas-api-key": baasApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            }).catch((err) => console.warn(`[DELETE] Leave error for bot ${b.bot_id}:`, err));
          }
        }
      }
    } catch (e) {
      console.warn("[DELETE] Error querying active MeetingBaas bots:", e);
    }

    // Delete associated records & meeting record
    await db.task.deleteMany({ where: { meetingId: id } });
    await db.decision.deleteMany({ where: { meetingId: id } });
    await db.actionItem.deleteMany({ where: { meetingId: id } });
    if (db.aIAgent && typeof (db.aIAgent as any).deleteMany === "function") {
      await (db.aIAgent as any).deleteMany({ where: { meetingId: id } }).catch(() => {});
    }

    // Now delete the meeting record
    await db.meeting.delete({ where: { id } });

    revalidateTag("meetings");
    revalidateTag("tasks");

    return NextResponse.json({ message: "Meeting deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/meetings/[id]]", error);
    return NextResponse.json({ error: error.message || "Failed to delete meeting" }, { status: 500 });
  }
}
