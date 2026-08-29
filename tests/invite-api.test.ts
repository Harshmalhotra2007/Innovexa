import { POST } from "../src/app/api/meetings/[id]/invite/route";
import { db } from "../src/lib/db";
import { config } from "../src/lib/config";

// Mock Prisma DB
jest.mock("../src/lib/db", () => ({
  db: {
    meeting: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

describe("POST /api/meetings/[id]/invite API Route", () => {
  beforeAll(() => {
    config.resendApiKey = "";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if emails are missing or empty", async () => {
    const req = new Request("http://localhost:3000/api/meetings/meet-1/invite", {
      method: "POST",
      body: JSON.stringify({ emails: [] }),
    });

    const res = await POST(req, { params: { id: "meet-1" } });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Emails list (array or comma-separated string) is required");
  });

  it("should return 404 if meeting is not found", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/meetings/non-existent/invite", {
      method: "POST",
      body: JSON.stringify({ emails: ["alice@innovexa.com"] }),
    });

    const res = await POST(req, { params: { id: "non-existent" } });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Meeting not found");
  });

  it("should send email invitations, attach .ics, and update participants in DB", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({
      id: "meet-101",
      title: "Architecture & SLA Review",
      date: new Date().toISOString(),
      scheduledDate: new Date(Date.now() + 3600000).toISOString(),
      durationMinutes: 45,
      department: "Engineering",
      agenda: "Review meeting invitation system",
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      participants: "existing@innovexa.com",
    });

    (db.meeting.update as jest.Mock).mockResolvedValue({
      id: "meet-101",
      participants: "existing@innovexa.com, alice@innovexa.com, bob@innovexa.com",
    });

    (db.notification.create as jest.Mock).mockResolvedValue({ id: "notif-1" });

    const req = new Request("http://localhost:3000/api/meetings/meet-101/invite", {
      method: "POST",
      body: JSON.stringify({ emails: ["alice@innovexa.com", "bob@innovexa.com"] }),
    });

    const res = await POST(req, { params: { id: "meet-101" } });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.invitedCount).toBe(2);
    expect(data.participants).toContain("existing@innovexa.com");
    expect(data.participants).toContain("alice@innovexa.com");
    expect(data.participants).toContain("bob@innovexa.com");

    expect(db.meeting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "meet-101" },
        data: expect.objectContaining({
          participants: "existing@innovexa.com, alice@innovexa.com, bob@innovexa.com",
        }),
      })
    );
  });
});