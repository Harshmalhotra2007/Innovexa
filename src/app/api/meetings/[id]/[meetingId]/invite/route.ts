import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

/**
 * Sends meeting invitation emails to participants and updates the meeting's participants field.
 */
export async function POST(
  req: Request,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;
    const { emails } = await req.json();

    // Validate input
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Emails array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Filter valid email strings
    const validEmails = emails
      .map((email: string) => email.trim())
      .filter((email: string) => email.length > 0 && /\S+@\S+\.\S+/.test(email));

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses provided" },
        { status: 400 }
      );
    }

    // Fetch the meeting
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, title: true, date: true, participants: true },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    // Prepare email content
    const meetingDate = new Date(meeting.date).toLocaleString();
    const emailFrom = config.emailFrom || "notifications@innovexa.com";
    const resendApiKey = config.resendApiKey;

    // Send invitation emails via Resend (if configured)
    if (resendApiKey) {
      const emailPromises = validEmails.map(async (email: string) => {
        const subject = `📧 Invitation: ${meeting.title}`;
        const html = `
          <!DOCTYPE html>
          <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D1315; color: #E7EEEF; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #141C1F; border: 1px solid #212B2E; border-radius: 12px; padding: 30px;">
                <div style="color: #E8A33D; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">
                  INNOVEXA OPS CONSOLE
                </div>
                <h2 style="color: #ffffff; margin-top: 0;">You're invited to: ${meeting.title}</h2>
                <p style="margin-bottom: 20px;">Hello,</p>
                <p>You have been invited to attend the following meeting:</p>
                <div style="background-color: #182124; border: 1px solid #2B383C; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; color: #9a99a0; text-transform: uppercase; font-weight: bold;">MEETING TITLE</span>
                    <div style="font-size: 14px; color: #ffffff; font-weight: bold;">${meeting.title}</div>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; color: #9a99a0; text-transform: uppercase; font-weight: bold;">DATE & TIME</span>
                    <div style="font-size: 14px; color: #49B9AE; font-weight: bold;">${meetingDate}</div>
                  </div>
                </div>
                <p style="margin-top: 20px;">
                  Please join the meeting at the scheduled time. Innovexa Notetaker will automatically join to capture transcripts and action items.
                </p>
                <div style="margin-top: 25px; font-size: 11px; color: #5B6A6E; border-top: 1px solid #212B2E; padding-top: 15px;">
                  This is an automated invitation from the Innovexa Ops Console.
                </div>
              </div>
            </body>
          </html>
        `;

        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [email],
              subject,
              html,
            }),
          });

          if (!response.ok) {
            console.warn(`[Invite Email] Resend API error for ${email}: ${response.status}`);
          }
        } catch (err) {
          console.error(`[Invite Email Error] Failed to send to ${email}:`, err);
        }
      });

      await Promise.all(emailPromises);
    } else {
      console.log("[Invite Email] Resend API not configured, logging invitations only");
      console.log(`[Invite Email] Would send to: ${validEmails.join(", ")}`);
    }

    // Update meeting participants field (append new emails, avoid duplicates)
    const existingParticipants = meeting.participants
      ? meeting.participants
          .split(",")
          .map((e: string) => e.trim())
          .filter((e: string) => e.length > 0)
      : [];
    const allParticipants = [...new Set([...existingParticipants, ...validEmails])];
    const participantsString = allParticipants.join(", ");

    await db.meeting.update({
      where: { id: meetingId },
      data: { participants: participantsString },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${validEmails.length} participant(s)`,
      participants: allParticipants,
    });
  } catch (error: any) {
    console.error("[Invite Route Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invitations" },
      { status: 500 }
    );
  }
}