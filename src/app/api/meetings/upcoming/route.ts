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
  } catch (err: any) {
    console.error("[Upcoming Meetings API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch upcoming meetings" }, { status: 500 });
  }
}
