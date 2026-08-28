import { EgressPipelineValidator } from "../src/lib/egress-pipeline-validator";
import { db } from "../src/lib/db";

// Mock database calls
jest.mock("../src/lib/db", () => ({
  db: {
    meeting: {
      findUnique: jest.fn(),
    },
    liveKitRoom: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Egress Security Pass - Input Sanitization & Authorization Guard", () => {
  beforeEach(() => {
    EgressPipelineValidator.clearAllLocks();
    jest.clearAllMocks();
  });

  it("should strip path traversal sequences and reject malicious room names", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({ id: "meet-security-1" });
    (db.liveKitRoom.findUnique as jest.Mock).mockResolvedValue({ recordingOn: false });

    const maliciousRoom = "../../../etc/passwd";
    const result = await EgressPipelineValidator.validate({
      roomName: maliciousRoom,
      meetingId: "meet-security-1",
      activeTrackCount: 1,
    });

    // Sanitizer strips slashes/dots: "etcpasswd"
    expect(result.sanitizedRoomName).not.toContain("/");
    expect(result.sanitizedRoomName).not.toContain("..");
    expect(result.sanitizedRoomName).toBe("etcpasswd");
  });

  it("should strip command injection and shell metacharacters", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({ id: "meet-100" });
    (db.liveKitRoom.findUnique as jest.Mock).mockResolvedValue({ recordingOn: false });

    const injectedRoom = "room-test; rm -rf / && echo 'pwned'";
    const result = await EgressPipelineValidator.validate({
      roomName: injectedRoom,
      meetingId: "meet-100",
      activeTrackCount: 1,
    });

    expect(result.sanitizedRoomName).not.toContain(";");
    expect(result.sanitizedRoomName).not.toContain("&");
    expect(result.sanitizedRoomName).not.toContain(" ");
    expect(result.sanitizedRoomName).toBe("room-testrm-rfechopwned");
  });

  it("should reject XSS script tags and illegal characters", async () => {
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({ id: "meet-101" });
    (db.liveKitRoom.findUnique as jest.Mock).mockResolvedValue({ recordingOn: false });

    const xssPayload = "<script>alert(1)</script>";
    const result = await EgressPipelineValidator.validate({
      roomName: xssPayload,
      meetingId: "meet-101",
      activeTrackCount: 1,
    });

    expect(result.sanitizedRoomName).not.toContain("<");
    expect(result.sanitizedRoomName).not.toContain(">");
    expect(result.sanitizedRoomName).toBe("scriptalert1script");
  });

  it("should enforce Role-Based Access Control and reject unauthorized requester roles with 403", async () => {
    const result = await EgressPipelineValidator.validate({
      roomName: "room-secure-1",
      meetingId: "meet-secure-1",
      requesterRole: "unauthorized_guest_bot",
      activeTrackCount: 1,
    });

    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.error).toContain("Forbidden: Unauthorized role");
  });

  it("should release mutex locks properly to prevent memory leaks or permanent lockouts", () => {
    const meetingId = "meet-lock-test";
    EgressPipelineValidator.acquireLock(meetingId, "EG_temp_99");

    // Release lock
    EgressPipelineValidator.releaseLock(meetingId);

    // Verify subsequent check does not return 429
    (db.meeting.findUnique as jest.Mock).mockResolvedValue({ id: meetingId });
    (db.liveKitRoom.findUnique as jest.Mock).mockResolvedValue({ recordingOn: false });

    return EgressPipelineValidator.validate({
      roomName: "room-lock-test",
      meetingId,
      activeTrackCount: 1,
    }).then((res) => {
      expect(res.valid).toBe(true);
      expect(res.statusCode).toBe(200);
    });
  });
});
