import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { sendMeetingInvitationEmails } from "@/lib/email-engine";
import { enqueuePreMeetingReminder } from "@/lib/notification-queue";

/**
 * Sends meeting invitation emails with iCalendar (.ics) calendar files
 * and updates the meeting's participants list.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return apiHandler(req, async (req) => {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { emails } = body;

    if (!emails || (!Array.isArray(emails) && typeof emails !== "string")) {
      throw new ApiError(400, "Emails list (array or comma-separated string) is required");
    }

    const emailList: string[] = (
      Array.isArray(emails)
        ? emails
        : emails.split(",")
    )
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0 && e.includes("@"));

    if (emailList.length === 0) {
      throw new ApiError(400, "No valid email addresses provided");
    }

    const meeting = await db.meeting.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        date: true,
        scheduledDate: true,
        durationMinutes: true,
        durationMins: true,
        department: true,
        agenda: true,
        googleMeetLink: true,
        participants: true,
      },
    });

    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const scheduledDate = meeting.scheduledDate || meeting.date;
    const durationMinutes = meeting.durationMinutes || meeting.durationMins || 30;

    // Dispatch full transactional emails with .ics calendar attachments and notifications
    const invitationResults = await sendMeetingInvitationEmails({
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      scheduledDate,
      durationMinutes,
      googleMeetLink: meeting.googleMeetLink,
      recipientEmails: emailList,
      agenda: meeting.agenda || undefined,
      department: meeting.department || "Engineering",
    }).catch((err) => {
      console.error(`[Meeting Invite Error] Failed to send invitations for ${meeting.id}:`, err);
      return [];
    });

    // Enqueue pre-meeting reminder if meeting is in the future
    if (new Date(scheduledDate).getTime() > Date.now() + 15 * 60 * 1000) {
      for (const email of emailList) {
        enqueuePreMeetingReminder(
          {
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            scheduledDate,
            googleMeetLink: meeting.googleMeetLink || "",
            recipientEmail: email,
            agenda: meeting.agenda || undefined,
            department: meeting.department || "Engineering",
          },
          15
        ).catch(() => {});
      }
    }

    // Merge new participants into meeting.participants
    const existingParticipants = meeting.participants
      ? meeting.participants
          .split(",")
          .map((e: string) => e.trim())
          .filter((e: string) => e.length > 0)
      : [];

    const allParticipants = Array.from(new Set([...existingParticipants, ...emailList]));

    await db.meeting.update({
      where: { id },
      data: { participants: allParticipants.join(", ") },
    });

    return {
      success: true,
      message: `Invitations sent to ${emailList.length} participant(s)`,
      invitedCount: emailList.length,
      participants: allParticipants,
      invitationResults,
    };
  });
}