import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SLAEmailTemplateParams {
  alertType: "DEADLINE_APPROACHING" | "TASK_OVERDUE" | "TASK_ESCALATED";
  taskTitle: string;
  taskDescription?: string;
  assigneeName: string;
  deadline: Date;
  hoursUntilDeadline?: number;
  hoursOverdue?: number;
  escalationLevel?: number;
  meetingTitle?: string;
  meetingId?: string;
  taskId: string;
  department: string;
  priority: string;
}

/**
 * Generate HTML email content for SLA alerts
 */
export function generateSLAEmailHtml(params: SLAEmailTemplateParams): string {
  const { alertType, taskTitle, taskDescription, assigneeName, deadline, hoursUntilDeadline, hoursOverdue, escalationLevel, meetingTitle, meetingId, taskId, department, priority } = params;

  const isOverdue = alertType === "TASK_OVERDUE";
  const isEscalated = alertType === "TASK_ESCALATED";
  const isApproaching = alertType === "DEADLINE_APPROACHING";

  // Color and icon based on alert type
  const primaryColor = isEscalated ? "#EF4444" : isOverdue ? "#EF4444" : "#F59E0B";
  const bgColor = isEscalated ? "rgba(239, 68, 68, 0.1)" : isOverdue ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)";
  const icon = isEscalated ? "⚠️" : isOverdue ? "🚨" : "⏰";
  const urgencyText = isEscalated
    ? `escalated to Level ${escalationLevel ?? 2} management oversight`
    : isOverdue
    ? `now ${Math.floor(hoursOverdue ?? 0)} hours overdue`
    : `due in ${hoursUntilDeadline ?? "<24"} hours`;

  // Format deadline nicely
  const formattedDeadline = deadline.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Task link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://innovexa-murex.vercel.app";
  const taskLink = `${baseUrl}/tasks/${taskId}`;
  const meetingLink = meetingId ? `${baseUrl}/meetings/${meetingId}` : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${icon} SLA Alert: ${taskTitle}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

        <!-- Header -->
        <tr>
          <td style="background-color: ${primaryColor}; padding: 24px 32px; text-align: center;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                  INNOVEXA SLA MONITOR
                </td>
              </tr>
              <tr>
                <td style="color: #ffffff; font-size: 28px; font-weight: 700; padding-top: 8px;">
                  ${icon} ${isEscalated ? "Task Escalated" : isOverdue ? "Task Overdue" : "Deadline Approaching"}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert Banner -->
        <tr>
          <td style="padding: 24px 32px;">
            <div style="background-color: ${bgColor}; border: 1px solid ${primaryColor}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">${icon}</span>
                <div>
                  <div style="font-weight: 700; color: ${primaryColor}; font-size: 16px;">
                    Action Required: Task "${taskTitle}" is ${urgencyText}
                  </div>
                  <div style="color: #4b5563; font-size: 14px; margin-top: 4px;">
                    Assigned to <strong>${assigneeName}</strong> • ${department} • Priority: ${priority}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding: 0 32px 16px 32px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937;">
              Hello <strong>${assigneeName}</strong>,
            </p>
          </td>
        </tr>

        <!-- Main message -->
        <tr>
          <td style="padding: 0 32px 16px 32px;">
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
              ${isEscalated
                ? `This action item has exceeded the SLA resolution threshold and has been automatically escalated to management (Level ${escalationLevel ?? 2}). Manager oversight is now required.`
                : isOverdue
                ? `This action item was due on ${formattedDeadline} and is currently overdue. Please review and complete or reassign this deliverable immediately.`
                : `This action item is approaching its deadline and will be due on ${formattedDeadline}. Please update progress or mark as completed.`
              }
            </p>
          </td>
        </tr>

        <!-- Details Card -->
        <tr>
          <td style="padding: 0 32px 24px 32px;">
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Task</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${taskTitle}</td>
                </tr>
                ${taskDescription ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Description</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0; color: #374151; font-size: 14px;">${taskDescription}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Assignee</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0; color: #374151; font-size: 14px; font-weight: 600;">${assigneeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Department</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0; color: #374151; font-size: 14px;">${department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Priority</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0; color: ${priority === "High" ? "#EF4444" : priority === "Low" ? "#10B981" : "#F59E0B"}; font-size: 14px; font-weight: 600;">${priority}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Deadline</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${formattedDeadline}</td>
                </tr>
                ${meetingTitle ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Source Meeting</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 0 0; color: #374151; font-size: 14px;">${meetingTitle}</td>
                </tr>
                ` : ""}
              </table>
            </div>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td style="padding: 0 32px 24px 32px; text-align: center;">
            <a href="${taskLink}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              View Task & Resolve
            </a>
          </td>
        </tr>

        ${meetingId ? `
        <!-- Meeting Link -->
        <tr>
          <td style="padding: 0 32px 24px 32px; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #6b7280; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
              💡 This task was generated from a meeting.
              <a href="${meetingLink}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Review the meeting summary</a>
            </p>
          </td>
        </tr>
        ` : ""}

        <!-- Divider -->
        <tr>
          <td style="padding: 0 32px 24px 32px;">
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 0 32px 32px 32px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
              Innovexa — Intelligent Meeting, Decision & Action System
            </p>
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">
              Automated SLA Governance Engine • You received this because you are assigned to this task.
            </p>
          </td>
        </tr>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send email via Resend API
 */
export interface SendEmailResult {
  delivered: boolean;
  messageId: string;
  error?: string;
}

export async function sendEmailViaResend(params: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!resendApiKey) {
    console.log(`[SLA Email] Mock dispatch to ${params.to.join(", ")} | Subject: ${params.subject}`);
    return { delivered: true, messageId };
  }

  try {
    const response = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (response.error) {
      console.error("[SLA Email] Resend error:", response.error);
      return { delivered: false, messageId, error: response.error.message };
    }

    return { delivered: true, messageId: response.data?.id || messageId };
  } catch (error: unknown) {
    console.error("[SLA Email] Exception:", error);
    return { delivered: false, messageId, error: (error as Error).message };
  }
}