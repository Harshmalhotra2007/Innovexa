import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upcomingMeetings = await db.meeting.findMany({
      where: {
        status: {
          in: ["Scheduled", "In Progress"],
        },
      },
      orderBy: {
        date: "asc",
      },
      include: {
        aiAgent: true,
      },
    });

    return NextResponse.json({
      status: "success",
      count: upcomingMeetings.length,
      meetings: upcomingMeetings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch upcoming meetings";
    console.error("[Upcoming Meetings API Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
