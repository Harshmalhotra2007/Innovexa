import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGoogleMeetLink } from "@/lib/meeting-scheduler";
import { enqueuePreMeetingReminder } from "@/lib/notification-queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Security Gate: Verify x-n8n-webhook-secret header
    const providedSecret = req.headers.get("x-n8n-webhook-secret");
    if (!providedSecret || providedSecret !== config.n8nWebhookSecret) {
      console.warn("[n8n Webhook Security] Unauthorized webhook access attempt.");
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing x-n8n-webhook-secret header" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      startTime,
      endTime,
      description = "",
      attendees = [],
      meetingUrl,
      department = "Engineering",
    } = body;

    if (!title || !startTime) {
      return NextResponse.json({ error: "title and startTime are required" }, { status: 400 });
    }

    const scheduledDate = new Date(startTime);
    const endDateTime = endTime ? new Date(endTime) : new Date(scheduledDate.getTime() + 30 * 60 * 1000);
    const durationMinutes = Math.max(15, Math.round((endDateTime.getTime() - scheduledDate.getTime()) / (60 * 1000)));

    const googleMeetLink = meetingUrl && meetingUrl.includes("meet.google.com")
      ? meetingUrl
      : null;

    const participantsList = Array.isArray(attendees)
      ? attendees.map((a: any) => (typeof a === "string" ? a : a.email)).filter(Boolean).join(", ")
      : String(attendees || "");

    // 2. Create or Update Meeting record in database
    const meeting = await db.meeting.create({
      data: {
        title: title.trim(),
        date: scheduledDate,
        scheduledDate,
        durationMins: durationMinutes,
        durationMinutes,
        googleMeetLink,
        department,
        agenda: description || `Synced via n8n Google/Outlook Calendar integration.`,
        participants: participantsList,
        status: "Scheduled",
      },
    });

    // 3. Enqueue Pre-Meeting Reminder (15 mins prior)
    const recipientEmail = participantsList.split(",")[0]?.trim() || "team@innovexa.com";
    const queueResult = await enqueuePreMeetingReminder(
      {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        scheduledDate,
        googleMeetLink,
        recipientEmail,
        agenda: meeting.agenda || undefined,
        department,
      },
      15
    );

    console.log(`[n8n Webhook] Calendar event '${title}' synced cleanly. Enqueued 15m reminder.`);

    return NextResponse.json({
      status: "success",
      message: "Calendar event synced and reminder enqueued successfully",
      meeting,
      reminderJob: queueResult,
    });
  } catch (err: any) {
    console.error("[n8n Calendar Webhook Error]", err);
    return NextResponse.json({ error: err.message || "Failed to process calendar webhook" }, { status: 500 });
  }
}
