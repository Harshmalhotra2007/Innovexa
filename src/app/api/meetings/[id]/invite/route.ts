import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

interface InviteRequest {
  emails: string[];
}

/**
 * Send meeting invitation emails to participants via Resend
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { emails } = (await req.json()) as InviteRequest;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Valid emails array is required" },
        { status: 400 }
      );
    }

    const meeting = await db.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    if (!config.resendApiKey) {
      console.warn("[InviteAPI] Resend not configured. Email not sent.");
      return NextResponse.json(
        { success: false, error: "Email service not configured" },
        { status: 503 }
      );
    }

    const formattedDate = meeting.date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); }
            .brand { color: #1D4ED8; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
            .header { font-size: 20px; font-weight: bold; color: #0F172A; margin-top: 15px; }
            .details { background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .label { font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: bold; }
            .value { font-size: 14px; color: #1D4ED8; font-weight: bold; margin-bottom: 12px; }
            .button { display: inline-block; background-color: #1D4ED8; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 15px; }
            .footer { font-size: 11px; color: #64748B; margin-top: 25px; border-top: 1px solid #E2E8F0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">INNOVEXA OPS CONSOLE</div>
            <div class="header">📅 You're Invited: ${meeting.title}</div>
            <p>Hello,</p>
            <p>You have been invited to an AI-powered meeting.</p>
            <div class="details">
              <div class="label">MEETING TITLE</div>
              <div class="value">${meeting.title}</div>
              <div class="label">SCHEDULED DATE & TIME</div>
              <div class="value">${formattedDate}</div>
              ${meeting.department ? `<div class="label">DEPARTMENT</div><div class="value">${meeting.department}</div>` : ""}
              ${meeting.agenda ? `<div class="label">AGENDA</div><div class="value" style="color: #0F172A; font-weight: normal;">${meeting.agenda}</div>` : ""}
            </div>
            <a href="${config.appUrl}/meetings/${meeting.id}" class="button">VIEW MEETING DETAILS</a>
            <div class="footer">
              Innovexa Notetaker will automatically join the meeting to capture live diarized transcripts & automated action items.
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails in parallel
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to: [email.trim()],
            subject: `Invitation: ${meeting.title}`,
            html,
          }),
        });
        return { email, success: response.ok };
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.filter((r) => r.status === "rejected" || !r.value.success).length;

    // Save notification records
    await db.notification.createMany({
      data: emails.map((email) => ({
        recipient: email.trim(),
        subject: `Invitation: ${meeting.title}`,
        body: `Meeting invitation sent for ${meeting.title}`,
        type: "MEETING_INVITATION",
        read: false,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${succeeded} invitation(s)`,
      total: emails.length,
      succeeded,
      failed,
    });
  } catch (error: any) {
    console.error("[InviteAPI] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invitations" },
      { status: 500 }
    );
  }
}
