import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { revalidateTag } from "next/cache";
import { apiHandler, ApiError } from "@/lib/api-handler";

function extractMeetCode(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
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
      throw new ApiError(404, "Meeting not found");
    }

    return meeting;
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const role = req.headers.get("x-user-role");
    if (role !== "organizer") {
      throw new ApiError(403, "Forbidden: Requester must be an organizer");
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

    const botServiceUrl = config.meetBotUrl;
    const meetingUrl = meeting?.agenda?.includes("meet.google.com") ? meeting.agenda : null;
    const meetCode = extractMeetCode(meetingUrl);
    const baasApiKey = config.meetingBaasApiKey;

    // Fire off external API bot cleanup calls asynchronously in the background to prevent route timeout hangs
    (async () => {
      // 1. Signal Render Cloud Bot to leave
      if (meetingUrl) {
        try {
          const leaveController = new AbortController();
          const leaveTimeoutId = setTimeout(() => leaveController.abort(), 2000);
          await fetch(`${botServiceUrl}/bot/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meetingUrl }),
            signal: leaveController.signal,
          });
          clearTimeout(leaveTimeoutId);
          console.log("[DELETE] Bot leave signal sent for:", meetingUrl);
        } catch (e) {
          console.warn("[DELETE] Bot leave signal failed (non-blocking):", e);
        }
      }

      // 2. Query MeetingBaas API for active bots matching meeting URL or Meet Code
      try {
        const listController = new AbortController();
        const listTimeoutId = setTimeout(() => listController.abort(), 3000);
        const listRes = await fetch("https://api.meetingbaas.com/v2/bots", {
          headers: { "x-meeting-baas-api-key": baasApiKey },
          signal: listController.signal,
        });
        clearTimeout(listTimeoutId);

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
            const botLeaveController = new AbortController();
            const botLeaveTimeoutId = setTimeout(() => botLeaveController.abort(), 2000);
            await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
              method: "POST",
              headers: {
                "x-meeting-baas-api-key": baasApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
              signal: botLeaveController.signal,
            }).catch((err) => console.warn(`[DELETE] Leave error for bot ${b.bot_id}:`, err))
              .finally(() => clearTimeout(botLeaveTimeoutId));
          }

          if (activeBots.length === 0 && nonCompleted.length > 0) {
            for (const b of nonCompleted) {
              console.log(`[DELETE] Global fail-safe leave to bot: ${b.bot_id}`);
              const globalLeaveController = new AbortController();
              const globalLeaveTimeoutId = setTimeout(() => globalLeaveController.abort(), 2000);
              await fetch(`https://api.meetingbaas.com/v2/bots/${b.bot_id}/leave`, {
                method: "POST",
                headers: {
                  "x-meeting-baas-api-key": baasApiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
                signal: globalLeaveController.signal,
              }).catch((err) => console.warn(`[DELETE] Leave error for bot ${b.bot_id}:`, err))
                .finally(() => clearTimeout(globalLeaveTimeoutId));
            }
          }
        }
      } catch (e) {
        console.warn("[DELETE] Error querying active MeetingBaas bots:", e);
      }
    })();

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

    return { message: "Meeting deleted successfully" };
  });
}
