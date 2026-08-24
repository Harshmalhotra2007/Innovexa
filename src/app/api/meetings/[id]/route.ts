import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";

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
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "organizer") {
      return NextResponse.json({ error: "Forbidden: Requester must be an organizer" }, { status: 403 });
    }

    const { id } = params;

    // Delete associated tasks, decisions, and action items first
    await db.task.deleteMany({ where: { meetingId: id } });
    await db.decision.deleteMany({ where: { meetingId: id } });
    await db.actionItem.deleteMany({ where: { meetingId: id } });

    // Delete the meeting
    await db.meeting.delete({ where: { id } });

    revalidateTag("meetings");
    revalidateTag("tasks");

    return NextResponse.json({ message: "Meeting deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete meeting" }, { status: 500 });
  }
}

