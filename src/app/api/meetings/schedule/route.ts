import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startMeetingSchedulerWorker } from "@/lib/meeting-scheduler";
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

    // Use user-provided Google Meet Link or store null
    const googleMeetLink = customMeetLink && customMeetLink.includes("meet.google.com")
      ? customMeetLink
      : null;

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
        agenda: agenda || undefined,
        objectives,
        participants,
        recurring,
        status: "Scheduled",
      },
    });

    // Start background worker to ensure auto-launch at scheduled time
    startMeetingSchedulerWorker();

    // Send meeting invitation email to all participants immediately
    const participantList = (participants || "")
      .split(",")
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0 && p.includes("@"));

    let invitationResults: unknown[] = [];
    if (participantList.length > 0) {
      const { sendMeetingInvitationEmails } = await import("@/lib/email-engine");
      invitationResults = await sendMeetingInvitationEmails({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        scheduledDate: targetDateTime,
        durationMinutes,
        googleMeetLink,
        recipientEmails: participantList,
        agenda: meeting.agenda || undefined,
        department,
      }).catch((e) => {
        console.error("Failed to send meeting invitations:", e);
        return [];
      });
    }

    // Auto-enqueue 15-minute pre-meeting email reminder for all valid participants
    const reminderJobs: unknown[] = [];
    for (const participant of participantList) {
      try {
        const job = await enqueuePreMeetingReminder(
          {
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            scheduledDate: targetDateTime,
            googleMeetLink: googleMeetLink || "",
            recipientEmail: participant,
            agenda: meeting.agenda || undefined,
            department,
          },
          15
        );
        reminderJobs.push(job);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to enqueue reminder for ${participant}:`, msg);
      }
    }

    return NextResponse.json({
      status: "success",
      message: "Meeting scheduled successfully",
      meeting,
      googleMeetLink,
      invitationResults,
      reminderJobs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to schedule meeting";
    console.error("[Schedule Meeting API Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
