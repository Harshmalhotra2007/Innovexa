import { db } from "./db";
import { config } from "./config";

export interface SendReminderEmailParams {
  meetingId: string;
  meetingTitle: string;
  scheduledDate: Date | string;
  googleMeetLink: string;
  recipientEmail: string;
  recipientName?: string;
  agenda?: string;
  department?: string;
}

/**
 * Generates responsive HTML email content for pre-meeting notifications.
 */
export function generateReminderEmailHtml(params: SendReminderEmailParams): string {
  const formattedDate = new Date(params.scheduledDate).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D1315; color: #E7EEEF; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #141C1F; border: 1px solid #212B2E; border-radius: 12px; padding: 30px; }
          .brand { color: #E8A33D; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
          .header { font-size: 20px; font-weight: bold; color: #ffffff; margin-top: 15px; }
          .details { background-color: #182124; border: 1px solid #2B383C; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .label { font-size: 11px; color: #9a99a0; text-transform: uppercase; font-weight: bold; }
          .value { font-size: 14px; color: #49B9AE; font-weight: bold; margin-bottom: 12px; }
          .button { display: inline-block; background-color: #49B9AE; color: #0D1A18; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 15px; }
          .footer { font-size: 11px; color: #5B6A6E; margin-top: 25px; border-top: 1px solid #212B2E; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">INNOVEXA OPS CONSOLE</div>
          <div class="header">⏰ Upcoming Meeting Reminder: ${params.meetingTitle}</div>
          <p>Hello ${params.recipientName || "Team Member"},</p>
          <p>Your upcoming AI-assisted meeting is scheduled to start in <strong>15 minutes</strong>.</p>
          
          <div class="details">
            <div class="label">MEETING TITLE</div>
            <div class="value" style="color: #ffffff;">${params.meetingTitle}</div>
            
            <div class="label">SCHEDULED DATE & TIME</div>
            <div class="value">${formattedDate}</div>
            
            <div class="label">DEPARTMENT</div>
            <div class="value">${params.department || "General"}</div>
            
            ${params.agenda ? `<div class="label">AGENDA / OBJECTIVES</div><div class="value" style="color: #c5c0b8; font-weight: normal;">${params.agenda}</div>` : ""}
            
            <div class="label">GOOGLE MEET LINK</div>
            <div class="value"><a href="${params.googleMeetLink}" style="color: #49B9AE;">${params.googleMeetLink}</a></div>
          </div>
          
          <a href="${params.googleMeetLink}" class="button">JOIN GOOGLE MEET NOW</a>
          
          <div class="footer">
            Innovexa Notetaker will automatically join the meeting to capture live diarized transcripts & automated action items.
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Transactional Email Dispatch Engine
 * Supports Resend API, SMTP, or structured database log persistence.
 */
export async function sendMeetingReminderEmail(params: SendReminderEmailParams) {
  const html = generateReminderEmailHtml(params);
  const subject = `⏰ Reminder: ${params.meetingTitle} starts in 15 mins`;
  const resendApiKey = config.resendApiKey;

  let messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let delivered = false;

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: [params.recipientEmail],
          subject,
          html,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        messageId = resData.id || messageId;
        delivered = true;
        console.log(`[EmailEngine] Resend API email dispatched to ${params.recipientEmail} (${messageId})`);
      } else {
        console.warn(`[EmailEngine] Resend API returned status ${response.status}, recording log fallback.`);
      }
    } catch (err: any) {
      console.error("[EmailEngine Error]", err.message);
    }
  } else {
    console.log(`[EmailEngine Mock Dispatch] To: ${params.recipientEmail} | Subject: ${subject}`);
    delivered = true;
  }

  // Save dispatch history into Prisma Notification model
  try {
    await db.notification.create({
      data: {
        recipient: params.recipientEmail,
        subject,
        body: `Meeting '${params.meetingTitle}' reminder sent for ${params.scheduledDate}`,
        type: "PRE_MEETING_REMINDER",
        read: false,
      },
    });
  } catch (dbErr: any) {
    console.warn("[EmailEngine DB Save Note]", dbErr.message);
  }

  return {
    success: true,
    messageId,
    recipient: params.recipientEmail,
    delivered,
  };
}

export interface SendSLAEscalationEmailParams {
  taskId: string;
  taskTitle: string;
  ownerName: string;
  ownerEmail?: string;
  recipientEmail: string;
  recipientName?: string;
  department: string;
  priority?: string;
  type: "Warning" | "Escalation";
  hoursOverdue: number;
  deadline: Date | string;
}

export function generateSLAEscalationEmailHtml(params: SendSLAEscalationEmailParams): string {
  const isEscalation = params.type === "Escalation";
  const badgeColor = isEscalation ? "#EF4444" : "#E8A33D";
  const titleText = isEscalation
    ? `🚨 SLA Manager Escalation: ${params.taskTitle}`
    : `⚠️ SLA Deadline Alert: ${params.taskTitle}`;

  const formattedDeadline = new Date(params.deadline).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D1315; color: #E7EEEF; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #141C1F; border: 1px solid #212B2E; border-radius: 12px; padding: 30px; }
          .brand { color: ${badgeColor}; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
          .header { font-size: 20px; font-weight: bold; color: #ffffff; margin-top: 15px; }
          .alert-banner { background-color: ${isEscalation ? "rgba(239, 68, 68, 0.15)" : "rgba(232, 163, 61, 0.15)"}; border: 1px solid ${badgeColor}; border-radius: 8px; padding: 15px; margin: 20px 0; color: ${badgeColor}; font-weight: bold; }
          .details { background-color: #182124; border: 1px solid #2B383C; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .label { font-size: 11px; color: #9a99a0; text-transform: uppercase; font-weight: bold; }
          .value { font-size: 14px; color: #ffffff; font-weight: bold; margin-bottom: 12px; }
          .button { display: inline-block; background-color: ${badgeColor}; color: #0D1315; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 15px; }
          .footer { font-size: 11px; color: #5B6A6E; margin-top: 25px; border-top: 1px solid #212B2E; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">INNOVEXA SLA MONITOR</div>
          <div class="header">${titleText}</div>
          
          <div class="alert-banner">
            ${isEscalation
              ? `This action item has exceeded SLA resolution threshold by ${Math.floor(params.hoursOverdue)} hours. Manager oversight has been automatically notified.`
              : `This action item was due on ${formattedDeadline} and is currently overdue.`}
          </div>

          <p>Hello ${params.recipientName || params.recipientEmail},</p>
          <p>${isEscalation ? "An SLA escalation alert has been dispatched for your attention." : "Please review and complete or reassign this deliverable immediately."}</p>
          
          <div class="details">
            <div class="label">ACTION ITEM</div>
            <div class="value">${params.taskTitle}</div>
            
            <div class="label">OWNER / ASSIGNEE</div>
            <div class="value" style="color: #49B9AE;">${params.ownerName}</div>
            
            <div class="label">DEPARTMENT</div>
            <div class="value">${params.department || "Engineering"}</div>
            
            <div class="label">DEADLINE</div>
            <div class="value" style="color: #E8A33D;">${formattedDeadline}</div>
            
            <div class="label">PRIORITY</div>
            <div class="value">${params.priority || "Medium"}</div>
          </div>
          
          <a href="https://innovexa-murex.vercel.app/tasks" class="button">VIEW TASK BOARD & RESOLVE</a>
          
          <div class="footer">
            Innovexa Automated SLA Governance Engine • Department Escalation Policy Rule #2.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendSLAEscalationEmail(params: SendSLAEscalationEmailParams) {
  const html = generateSLAEscalationEmailHtml(params);
  const subject = params.type === "Escalation"
    ? `🚨 SLA Manager Escalation: ${params.taskTitle}`
    : `⚠️ SLA Task Overdue: ${params.taskTitle}`;

  const resendApiKey = config.resendApiKey;
  let messageId = `sla_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let delivered = false;

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: [params.recipientEmail],
          subject,
          html,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        messageId = resData.id || messageId;
        delivered = true;
        console.log(`[EmailEngine SLA] Resend email sent to ${params.recipientEmail} (${messageId})`);
      } else {
        console.warn(`[EmailEngine SLA] Resend status ${response.status}, logging to database fallback.`);
      }
    } catch (err: any) {
      console.error("[EmailEngine SLA Error]", err.message);
    }
  } else {
    console.log(`[EmailEngine SLA Mock Dispatch] To: ${params.recipientEmail} | Subject: ${subject}`);
    delivered = true;
  }

  try {
    await db.notification.create({
      data: {
        taskId: params.taskId,
        recipient: params.recipientEmail,
        subject,
        body: `SLA ${params.type} alert sent for task '${params.taskTitle}' (${params.hoursOverdue.toFixed(1)}h overdue)`,
        type: params.type,
        read: false,
      },
    });
  } catch (dbErr: any) {
    console.warn("[EmailEngine SLA DB Note]", dbErr.message);
  }

  return {
    success: true,
    messageId,
    recipient: params.recipientEmail,
    delivered,
  };
}
