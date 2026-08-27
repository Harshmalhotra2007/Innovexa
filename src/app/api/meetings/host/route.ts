import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { triggerAIAgent } from "@/lib/ai-agent-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      department = "Engineering",
      googleMeetLink,
      agenda,
    } = body;

    const now = new Date();
    const meetingTitle = (title && title.trim())
      ? title.trim()
      : `Instant Host AI Session - ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

    const meetUrl = googleMeetLink && googleMeetLink.trim()
      ? googleMeetLink.trim()
      : undefined;

    // 1. Create instant meeting record with status "In Progress"
    const meeting = await db.meeting.create({
      data: {
        title: meetingTitle,
        date: now,
        scheduledDate: now,
        durationMins: 45,
        durationMinutes: 45,
        googleMeetLink: meetUrl,
        department,
        agenda: agenda || (meetUrl ? `Google Meet Room: ${meetUrl}` : `Instant Host Meeting Session`),
        status: "In Progress",
      },
    });

    // 2. Trigger AI Bot immediately
    triggerAIAgent(meeting.id).catch((err) => {
      console.warn(`[Host Meeting API] Bot dispatch note for meeting ${meeting.id}:`, err.message);
    });

    console.log(`[Host Meeting API] Created instant meeting '${meetingTitle}' (${meeting.id}). Bot dispatched.`);

    return NextResponse.json({
      status: "success",
      message: "Instant meeting hosted successfully",
      meetingId: meeting.id,
      meeting,
      googleMeetLink: meetUrl,
    });
  } catch (err: any) {
    console.error("[Host Meeting API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to host instant meeting" }, { status: 500 });
  }
}
