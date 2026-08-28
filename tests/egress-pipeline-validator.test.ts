import { EgressPipelineValidator } from "../src/lib/egress-pipeline-validator";
import { db } from "../src/lib/db";

// Mock database calls
jest.mock("../src/lib/db", () => ({
  db: {
    meeting: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    liveKitRoom: {
      findUnique: jest.fn(),
    },
  },
}));

describe("EgressPipelineValidator - Pipeline API Validation", () => {
  beforeEach(() => {
    EgressPipelineValidator.clearAllLocks();
    jest.clearAllMocks();
  });

  it("should validate and accept valid egress start requests", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({
      id: "meet-12345",
      title: "Sprint Sync",
    });
    (db.liveKitRoom.findUnique as jest.Mock).mockResolvedValue({
      meetingId: "meet-12345",
      recordingOn: false,
    });

    const result = await EgressPipelineValidator.validate({
      roomName: "innovexa-meeting-meet-12345",
      meetingId: "meet-12345",
      requesterRole: "organizer",
      activeTrackCount: 1,
    });

    expect(result.valid).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.sanitizedRoomName).toBe("innovexa-meeting-meet-12345");
    expect(result.sanitizedMeetingId).toBe("meet-12345");
  });

  it("should reject missing or empty roomName or meetingId with 400", async () => {
    const res1 = await EgressPipelineValidator.validate({
      roomName: "",
      meetingId: "meet-123",
    });
    expect(res1.valid).toBe(false);
    expect(res1.statusCode).toBe(400);

    const res2 = await EgressPipelineValidator.validate({
      roomName: "room-123",
      meetingId: "",
    });
    expect(res2.valid).toBe(false);
    expect(res2.statusCode).toBe(400);
  });

  it("should reject requests with 0 active tracks with 422 (Prevent Zero-Track Race Condition)", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({
      id: "meet-123",
      title: "Design Sync",
    });

    const result = await EgressPipelineValidator.validate({
      roomName: "room-meet-123",
      meetingId: "meet-123",
      activeTrackCount: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(422);
    expect(result.error).toContain("No active audio or video tracks published");
  });

  it("should reject duplicate concurrent requests with 429 when lock is active", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({
      id: "meet-456",
      title: "Quarterly Review",
    });

    // Acquire lock first
    EgressPipelineValidator.acquireLock("meet-456", "EG_existing_123");

    const result = await EgressPipelineValidator.validate({
      roomName: "room-meet-456",
      meetingId: "meet-456",
      activeTrackCount: 1,
    });

    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(429);
    expect(result.existingEgressId).toBe("EG_existing_123");
    expect(result.error).toContain("Duplicate Egress request rejected");
  });

  it("should return 404 when meeting is not found in database", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue(null);
    (db.meeting.create as jest.Mock).mockRejectedValue(new Error("DB creation failed"));

    const result = await EgressPipelineValidator.validate({
      roomName: "room-not-found",
      meetingId: "meet-non-existent",
      activeTrackCount: 1,
    });

    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.error).toContain("not found in registry");
  });

  it("should return 409 when room is already actively recording in database", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({ id: "meet-789" });
    (db.liveKitRoom.findUnique as jest.Mock).mockResolvedValue({
      meetingId: "meet-789",
      recordingOn: true,
    });

    const result = await EgressPipelineValidator.validate({
      roomName: "room-meet-789",
      meetingId: "meet-789",
      activeTrackCount: 1,
    });

    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.error).toContain("already being recorded");
  });
});
