import { generateReminderEmailHtml, sendMeetingReminderEmail, generateICSFile, sendMeetingInvitationEmails } from "../src/lib/email-engine";
import { enqueuePreMeetingReminder, getNotificationQueueStatus } from "../src/lib/notification-queue";
import { config } from "../src/lib/config";

describe("Pre-Meeting Reminder & Transactional Email Engine Tests", () => {
  beforeAll(() => {
    config.resendApiKey = "";
  });

  it("should generate valid responsive HTML containing meeting metadata and Google Meet link", () => {
    const html = generateReminderEmailHtml({
      meetingId: "test-meet-123",
      meetingTitle: "Q4 Roadmap Architecture Sync",
      scheduledDate: "2026-08-28T10:00:00.000Z",
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      recipientEmail: "developer@innovexa.com",
      recipientName: "Alex Developer",
      agenda: "Review micro-services and Redis delayed queue",
    });

    expect(html).toContain("INNOVEXA OPS CONSOLE");
    expect(html).toContain("Q4 Roadmap Architecture Sync");
    expect(html).toContain("https://meet.google.com/abc-defg-hij");
    expect(html).toContain("Alex Developer");
    expect(html).toContain("Review micro-services and Redis delayed queue");
  });

  it("should calculate correct delay milliseconds for 15-minute offset and enqueue job", async () => {
    const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 mins in future
    const res = await enqueuePreMeetingReminder(
      {
        meetingId: "meet-test-999",
        meetingTitle: "Sprint Retrospective",
        scheduledDate: futureDate,
        googleMeetLink: "https://meet.google.com/xyz-uvwx-rst",
        recipientEmail: "lead@innovexa.com",
      },
      15 // 15 mins prior
    );

    expect(res.enqueued).toBe(true);
    expect(res.jobId).toBe("reminder_meet-test-999_15m");
    // Expected delay should be approx 15 minutes (900,000 ms)
    expect(res.delayMs).toBeGreaterThan(800000);
    expect(res.delayMs).toBeLessThan(950000);
  });

  it("should dispatch transactional email via logger fallback and persist notification status", async () => {
    const result = await sendMeetingReminderEmail({
      meetingId: "meet-test-888",
      meetingTitle: "Security Audit Review",
      scheduledDate: new Date().toISOString(),
      googleMeetLink: "https://meet.google.com/sec-pass-check",
      recipientEmail: "security@innovexa.com",
    });

    expect(result.success).toBe(true);
    expect(result.recipient).toBe("security@innovexa.com");
    expect(result.delivered).toBe(true);
  });

  it("should generate a valid RFC 5545 iCalendar (.ics) string", () => {
    const ics = generateICSFile({
      meetingId: "meet-invite-123",
      title: "Q4 Roadmap Architecture Sync",
      description: "Review micro-services and Redis delayed queue",
      startDate: "2026-08-28T10:00:00.000Z",
      durationMinutes: 45,
      location: "https://meet.google.com/abc-defg-hij",
      organizerEmail: "notifications@innovexa.com",
      attendees: ["dev1@innovexa.com", "dev2@innovexa.com"],
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("UID:meet-invite-123");
    expect(ics).toContain("SUMMARY:Q4 Roadmap Architecture Sync");
    expect(ics).toContain("LOCATION:https://meet.google.com/abc-defg-hij");
    expect(ics).toContain("ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=dev1@innovexa.com:MAILTO:dev1@innovexa.com");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("should dispatch meeting invitations to all participants and create notification logs", async () => {
    const results = await sendMeetingInvitationEmails({
      meetingId: "meet-invite-999",
      meetingTitle: "Sprint Planning",
      scheduledDate: new Date().toISOString(),
      durationMinutes: 30,
      googleMeetLink: "https://meet.google.com/xyz-uvwx-rst",
      recipientEmails: ["alice@innovexa.com", "bob@innovexa.com"],
      agenda: "Planning task distribution",
      department: "Product",
    });

    expect(results.length).toBe(2);
    expect(results[0].recipient).toBe("alice@innovexa.com");
    expect(results[1].recipient).toBe("bob@innovexa.com");
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[0].delivered).toBe(true);
    expect(results[1].delivered).toBe(true);
  });
});
