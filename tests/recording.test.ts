import { POST } from "../src/app/api/recordings/upload/route";
import { GET } from "../src/app/api/recordings/meeting/[meetingId]/route";
import { db } from "../src/lib/db";

// Mock the Prisma DB client
jest.mock("../src/lib/db", () => ({
  db: {
    meeting: {
      findUnique: jest.fn(),
    },
    recording: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock storage helper to avoid network S3/Supabase calls
jest.mock("../src/lib/storage", () => ({
  uploadToStorage: jest.fn().mockResolvedValue("https://storage.provider.com/recordings/123/mock-audio.mp3"),
}));

// Mock Next.js cache utilities
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  unstable_cache: (fn: any) => fn,
}));

describe("Recordings Upload POST API Endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fail if requester is not organizer", async () => {
    const req = new Request("http://localhost/api/recordings/upload", {
      method: "POST",
      headers: { 
        "x-user-role": "participant",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meetingId: "meeting-1",
        audioBlob: "dGVzdC1hdWRpby1kYXRh", // "test-audio-data" in base64
        format: "audio/mp3",
        duration: 30
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("should fail if the meeting is not found", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/recordings/upload", {
      method: "POST",
      headers: {
        "x-user-role": "organizer",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meetingId: "non-existent-meeting",
        audioBlob: "dGVzdC1hdWRpby1kYXRh",
        format: "audio/mp3",
        duration: 30
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Meeting not found");
  });

  it("should upload successfully and create database entry if role is organizer", async () => {
    // Mock meeting exists
    (db.meeting.findUnique as jest.Mock).mockResolvedValueOnce({ id: "meeting-1", title: "Project Sync" });
    
    // Mock database creation output
    const mockRecording = {
      id: "rec-123",
      meetingId: "meeting-1",
      url: "https://storage.provider.com/recordings/123/mock-audio.mp3",
      duration: 30,
      size: 15,
      format: "audio/mp3",
      uploadedAt: new Date(),
    };
    (db.recording.create as jest.Mock).mockResolvedValueOnce(mockRecording);

    const req = new Request("http://localhost/api/recordings/upload", {
      method: "POST",
      headers: {
        "x-user-role": "organizer",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meetingId: "meeting-1",
        audioBlob: "dGVzdC1hdWRpby1kYXRh",
        format: "audio/mp3",
        duration: 30
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    
    const data = await res.json();
    expect(data.id).toBe("rec-123");
    expect(data.url).toBe("https://storage.provider.com/recordings/123/mock-audio.mp3");
    expect(db.recording.create).toHaveBeenCalled();
  });
});

describe("Recordings Fetch GET API Endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch all recordings for the specific meetingId", async () => {
    const mockRecordings = [
      { id: "rec-1", meetingId: "meeting-1", url: "url1", duration: 10, size: 100, format: "audio/mp3" },
      { id: "rec-2", meetingId: "meeting-1", url: "url2", duration: 20, size: 200, format: "audio/mp3" },
    ];
    (db.recording.findMany as jest.Mock).mockResolvedValueOnce(mockRecordings);

    const req = new Request("http://localhost/api/recordings/meeting/meeting-1", {
      method: "GET",
    });

    const res = await GET(req, { params: { meetingId: "meeting-1" } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.length).toBe(2);
    expect(data[0].id).toBe("rec-1");
    expect(db.recording.findMany).toHaveBeenCalledWith({
      where: { meetingId: "meeting-1" },
      orderBy: { uploadedAt: "desc" },
    });
  });
});
