import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}
