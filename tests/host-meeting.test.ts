import { db } from "../src/lib/db";

describe("Host Meeting API & Instant Dispatch Integration Tests", () => {
  it("should create an instant meeting record with status In Progress", async () => {
    const now = new Date();
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

    // Clean up
    await db.meeting.delete({ where: { id: meeting.id } });
  });
});
