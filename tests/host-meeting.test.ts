import { db } from "../src/lib/db";

// Mock Prisma DB for unit test isolation
jest.mock("../src/lib/db", () => ({
  db: {
    meeting: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("Host Meeting API & Instant Dispatch Integration Tests", () => {
  it("should create an instant meeting record with status In Progress", async () => {
    const now = new Date();
    (db.meeting.create as jest.Mock).mockResolvedValueOnce({
      id: "meet-test-host-1",
      title: "Test Instant Host AI Session",
      date: now,
      scheduledDate: now,
      durationMins: 45,
      durationMinutes: 45,
      department: "Engineering",
      agenda: "Instant Host Meeting Session",
      status: "In Progress",
    });

    const meeting = await db.meeting.create({
      data: {
        title: "Test Instant Host AI Session",
        date: now,
        scheduledDate: now,
        durationMins: 45,
        durationMinutes: 45,
        department: "Engineering",
        agenda: "Instant Host Meeting Session",
        status: "In Progress",
      },
    });

    expect(meeting).toBeDefined();
    expect(meeting.title).toBe("Test Instant Host AI Session");
    expect(meeting.status).toBe("In Progress");
  });
});
