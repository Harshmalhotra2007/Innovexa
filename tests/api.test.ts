import { DELETE } from "../src/app/api/meetings/[id]/route";
import { PATCH } from "../src/app/api/tasks/[id]/assign/route";
import { db } from "../src/lib/db";

// Mock the Prisma DB client
jest.mock("../src/lib/db", () => ({
  db: {
    task: {
      deleteMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    decision: {
      deleteMany: jest.fn(),
    },
    meeting: {
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Meetings DELETE API Endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fail if requester is not organizer", async () => {
    const req = new Request("http://localhost/api/meetings/1", {
      method: "DELETE",
      headers: { "x-user-role": "participant" },
    });

    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("should delete meeting and associated tasks/decisions if role is organizer", async () => {
    const req = new Request("http://localhost/api/meetings/1", {
      method: "DELETE",
      headers: { "x-user-role": "organizer" },
    });

    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Meeting deleted successfully");

    expect(db.task.deleteMany).toHaveBeenCalledWith({ where: { meetingId: "1" } });
    expect(db.decision.deleteMany).toHaveBeenCalledWith({ where: { meetingId: "1" } });
    expect(db.meeting.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});

describe("Tasks Assign PATCH API Endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fail if requester is not organizer", async () => {
    const req = new Request("http://localhost/api/tasks/1/assign", {
      method: "PATCH",
      headers: { "x-user-role": "participant" },
      body: JSON.stringify({ assigneeId: "user-1" }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(403);
  });

  it("should assign task if organizer", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: "user-1", name: "Alex Mercer", email: "alex@company.org" });
    (db.task.update as jest.Mock).mockResolvedValueOnce({ id: "1", assigneeId: "user-1" });

    const req = new Request("http://localhost/api/tasks/1/assign", {
      method: "PATCH",
      headers: {
        "x-user-role": "organizer",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assigneeId: "user-1" }),
    });

    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    expect(db.task.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        assigneeId: "user-1",
        ownerName: "Alex Mercer",
        ownerEmail: "alex@company.org",
      },
    });
  });
});
