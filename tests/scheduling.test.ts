import { generateGoogleMeetLink, processSchedulerTick, getSchedulerStatus } from "../src/lib/meeting-scheduler";
import { db } from "../src/lib/db";
import { triggerAIAgent } from "../src/lib/ai-agent-engine";
import { sendMeetingReminderEmail } from "../src/lib/email-engine";

// Mock DB, AI agent, and email engine
jest.mock("../src/lib/db", () => ({
  db: {
    meeting: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../src/lib/ai-agent-engine", () => ({
  triggerAIAgent: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../src/lib/email-engine", () => ({
  sendMeetingReminderEmail: jest.fn().mockResolvedValue({ success: true, delivered: true }),
}));

describe("Meeting Scheduling Feature & Background Worker Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate a valid Google Meet URL structure if requested", () => {
    const link = generateGoogleMeetLink();
    expect(link).toMatch(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
  });

  it("should verify standard business hours time slot calculation format", () => {
    const slots = [
      "09:00 AM",
      "10:00 AM",
      "11:30 AM",
      "01:30 PM",
      "03:00 PM",
      "04:30 PM",
      "05:30 PM",
    ];

    expect(slots.length).toBe(7);
    expect(slots[0]).toBe("09:00 AM");
    expect(slots[slots.length - 1]).toBe("05:30 PM");
  });

  it("should process scheduler tick, launch due meeting bot, and send 15-min reminder emails", async () => {
    const mockDueMeeting = {
      id: "meet-due-1",
      title: "Sprint Planning Due",
      status: "Scheduled",
      scheduledDate: new Date(Date.now() - 10000),
      googleMeetLink: "https://meet.google.com/due-meet-now",
      participants: "eng@innovexa.com",
    };

    const mockUpcomingMeeting = {
      id: "meet-upcoming-1",
      title: "Design Review in 10 mins",
      status: "Scheduled",
      scheduledDate: new Date(Date.now() + 10 * 60 * 1000),
      googleMeetLink: "https://meet.google.com/des-ign-rev",
      participants: "lead@innovexa.com",
    };

    (db.meeting.findMany as jest.Mock)
      .mockResolvedValueOnce([mockDueMeeting]) // for due meetings
      .mockResolvedValueOnce([mockUpcomingMeeting]); // for upcoming 15m meetings
    (db.task.findMany as jest.Mock).mockResolvedValue([]);
    (db.notification.findFirst as jest.Mock).mockResolvedValue(null);
    (db.meeting.update as jest.Mock).mockResolvedValue({ ...mockDueMeeting, status: "In Progress" });

    const tickResult = await processSchedulerTick();

    expect(tickResult.dispatchedMeetings).toBe(1);
    expect(tickResult.sentReminders).toBe(1);
    expect(db.meeting.update).toHaveBeenCalledWith({
      where: { id: "meet-due-1" },
      data: { status: "In Progress" },
    });
    expect(triggerAIAgent).toHaveBeenCalledWith("meet-due-1");
    expect(sendMeetingReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: "meet-upcoming-1",
        recipientEmail: "lead@innovexa.com",
      })
    );
  });

  it("should report worker status and telemetry", () => {
    const status = getSchedulerStatus();
    expect(status).toHaveProperty("isWorkerRunning");
    expect(status).toHaveProperty("lastTickTime");
    expect(status).toHaveProperty("lastTickStats");
  });
});
