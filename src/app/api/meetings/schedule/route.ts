import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGoogleMeetLink, startMeetingSchedulerWorker } from "@/lib/meeting-scheduler";
import { enqueuePreMeetingReminder } from "@/lib/notification-queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      scheduledDate,
      timeSlot,
      durationMinutes = 30,
      department = "Engineering",
      agenda = "",
      objectives = "",
      participants = "",
      recurring = false,
      googleMeetLink: customMeetLink,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Meeting title is required" }, { status: 400 });
    }

    if (!scheduledDate) {
      return NextResponse.json({ error: "Scheduled date is required" }, { status: 400 });
    }

    // Parse date and timeSlot into full ISO DateTime
    let targetDateTime = new Date(scheduledDate);
    if (timeSlot) {
      const [timeStr, period] = timeSlot.split(" ");
      let [hours, mins] = timeStr.split(":").map((n: string) => parseInt(n, 10));
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      targetDateTime.setHours(hours, mins, 0, 0);
    }

    // Generate valid Google Meet Link if not provided
    const googleMeetLink = customMeetLink && customMeetLink.includes("meet.google.com")
      ? customMeetLink
      : generateGoogleMeetLink();

    // Create Meeting record in database
    const meeting = await db.meeting.create({
      data: {
        title: title.trim(),
        date: targetDateTime,
        scheduledDate: targetDateTime,
        durationMins: durationMinutes,
        durationMinutes,
        googleMeetLink,
        department,
        agenda: agenda || `Google Meet Room: ${googleMeetLink}`,
        objectives,
        participants,
        recurring,
        status: "Scheduled",
      },
    });

    // Start background worker to ensure auto-launch at scheduled time
    startMeetingSchedulerWorker();

    // Auto-enqueue 15-minute pre-meeting email reminder
    const firstParticipant = participants.split(",")[0]?.trim() || "team@innovexa.com";
    const reminderJob = await enqueuePreMeetingReminder(
      {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        scheduledDate: targetDateTime,
        googleMeetLink,
        recipientEmail: firstParticipant,
        agenda: meeting.agenda || undefined,
        department,
      },
      15
    );

    return NextResponse.json({
      status: "success",
      message: "Meeting scheduled successfully",
      meeting,
      googleMeetLink,
      reminderJob,
    });
  } catch (err: any) {
    console.error("[Schedule Meeting API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to schedule meeting" }, { status: 500 });
  }
}
