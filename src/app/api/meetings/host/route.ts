import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { triggerAIAgent } from "@/lib/ai-agent-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, department, googleMeetLink, agenda } = body;

    const meetingTitle = title || `Instant AI Meeting (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const meetingDepartment = department || "Engineering";
    const meetingAgenda = googleMeetLink || agenda || "Instant AI Notetaker session launched by user.";

    // 1. Create instant Meeting record with "In Progress" status
    const meeting = await db.meeting.create({
      data: {
        title: meetingTitle,
        department: meetingDepartment,
        agenda: meetingAgenda,
        status: "In Progress",
        date: new Date(),
      },
    });

    // 2. Trigger Playwright Bot asynchronously
    triggerAIAgent(meeting.id).catch((err) =>
      console.warn(`[POST /api/meetings/host] Async bot trigger failed for ${meeting.id}:`, err)
    );

    return NextResponse.json({
      message: "Instant meeting created successfully",
      meetingId: meeting.id,
      status: meeting.status,
    });
  } catch (error: any) {
    console.error("[POST /api/meetings/host]", error);
    return NextResponse.json(
      { error: error.message || "Failed to host instant meeting" },
      { status: 500 }
    );
  }
}
