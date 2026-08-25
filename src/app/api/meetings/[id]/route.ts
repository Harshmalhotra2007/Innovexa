import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";

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

    // Signal bot to leave BEFORE deleting the record
    const botServiceUrl = process.env.BOT_SERVICE_URL || process.env.MEET_BOT_URL || "https://innovexa-meet-bot.onrender.com";
    const meetingUrl = meeting?.agenda?.includes("meet.google.com") ? meeting.agenda : null;

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

    // Check if MeetingBaas bot was active
    let agent: any = null;
    try {
      agent = await db.aIAgent.findUnique({ where: { meetingId: id } });
    } catch (e) {
      agent = null;
    }

    if (agent && agent.recordingUrl && agent.recordingUrl.startsWith("baas_")) {
      const botId = agent.recordingUrl.replace("baas_", "");
      const baasApiKey = process.env.MEETINGBAAS_API_KEY || DEFAULT_MEETINGBAAS_KEY;
      try {
        await fetch(`https://api.meetingbaas.com/v2/bots/${botId}/leave`, {
          method: "POST",
          headers: {
            "x-meeting-baas-api-key": baasApiKey,
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        console.warn("[DELETE] MeetingBaas bot leave signal failed:", e);
      }
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
