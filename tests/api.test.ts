import { DELETE } from "../src/app/api/meetings/[id]/route";
import { PATCH } from "../src/app/api/tasks/[id]/assign/route";
import { POST as JOIN_AI_AGENT } from "../src/app/api/ai-agent/join/route";
import { GET as GET_AI_STATUS } from "../src/app/api/ai-agent/status/[meetingId]/route";
import { GET as GET_AI_TRANSCRIPT } from "../src/app/api/ai-agent/[meetingId]/transcript/route";
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
    actionItem: {
      deleteMany: jest.fn(),
    },
    meeting: {
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    aIAgent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    aiAgent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Next.js cache utilities
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  unstable_cache: (fn: any) => fn,
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

    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("should delete meeting and associated tasks/decisions if role is organizer", async () => {
    const req = new Request("http://localhost/api/meetings/1", {
      method: "DELETE",
      headers: { "x-user-role": "organizer" },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Meeting deleted successfully");

    expect(db.task.deleteMany).toHaveBeenCalledWith({ where: { meetingId: "1" } });
    expect(db.decision.deleteMany).toHaveBeenCalledWith({ where: { meetingId: "1" } });
    expect(db.actionItem.deleteMany).toHaveBeenCalledWith({ where: { meetingId: "1" } });
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

    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
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

    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
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

describe("AI Agent Endpoints & Security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "joining" }),
      text: async () => "OK",
    } as any);
  });

  it("should fail POST /api/ai-agent/join if user is participant", async () => {
    const req = new Request("http://localhost/api/ai-agent/join", {
      method: "POST",
      headers: { "x-user-role": "participant" },
      body: JSON.stringify({ meetingId: "meet-1" }),
    });

    const res = await JOIN_AI_AGENT(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("should trigger AI Agent for organizer", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValueOnce({ id: "meet-1", title: "Test Meeting" });
    (db.aIAgent.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (db.aIAgent.create as jest.Mock).mockResolvedValueOnce({
      id: "agent-1",
      meetingId: "meet-1",
      status: "joining",
    });

    const req = new Request("http://localhost/api/ai-agent/join", {
      method: "POST",
      headers: { "x-user-role": "organizer", "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId: "meet-1" }),
    });

    const res = await JOIN_AI_AGENT(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe("joining");
  });

  it("should return status via GET /api/ai-agent/status/[meetingId]", async () => {
    (db.aIAgent.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "agent-1",
      meetingId: "meet-1",
      status: "completed",
      summary: "Sample Summary",
    });

    const req = new Request("http://localhost/api/ai-agent/status/meet-1");
    const res = await GET_AI_STATUS(req, { params: Promise.resolve({ meetingId: "meet-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("completed");
    expect(data.summary).toBe("Sample Summary");
  });

  it("should return transcript via GET /api/ai-agent/[meetingId]/transcript", async () => {
    (db.aIAgent.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "agent-1",
      meetingId: "meet-1",
      transcript: [{ speaker: "Alice", text: "Hello", timestamp: "00:00:01" }],
    });

    const req = new Request("http://localhost/api/ai-agent/meet-1/transcript");
    const res = await GET_AI_TRANSCRIPT(req, { params: Promise.resolve({ meetingId: "meet-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].speaker).toBe("Alice");
  });
});
