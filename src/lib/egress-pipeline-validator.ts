/**
 * EgressPipelineValidator
 * Validates, rate-limits, and sanitizes Egress recording requests
 * to prevent duplicate worker spawning, injection attacks, and invalid stream state.
 */

import { db } from "./db";
import { config } from "./config";

export interface EgressValidationRequest {
  roomName: string;
  meetingId: string;
  requesterRole?: string;
  audioOnly?: boolean;
  activeTrackCount?: number;
}

export interface EgressValidationResult {
  valid: boolean;
  statusCode: number;
  error?: string;
  sanitizedRoomName?: string;
  sanitizedMeetingId?: string;
  existingEgressId?: string | null;
  serverEgressReady: boolean;
}

// In-memory rate limiting & active egress mutex registry
const activeEgressLocks = new Map<string, { timestamp: number; egressId?: string }>();
const EGRESS_LOCK_TTL_MS = 60000; // 60s cooldown per room

export class EgressPipelineValidator {
  /**
   * Validates room parameters, database integrity, rate limiting, and track status.
   */
  public static async validate(
    request: EgressValidationRequest
  ): Promise<EgressValidationResult> {
    const { roomName, meetingId, requesterRole = "organizer", activeTrackCount = 1 } = request;

    // 1. Parameter presence and type check
    if (!roomName || typeof roomName !== "string" || roomName.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: "Invalid or missing 'roomName' parameter.",
        serverEgressReady: false,
      };
    }

    if (!meetingId || typeof meetingId !== "string" || meetingId.trim().length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: "Invalid or missing 'meetingId' parameter.",
        serverEgressReady: false,
      };
    }

    // 2. Security Sanitization (Prevent path traversal, shell metacharacters, and XSS)
    const sanitizedRoom = roomName.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    const sanitizedId = meetingId.trim().replace(/[^a-zA-Z0-9_-]/g, "");

    if (sanitizedRoom.length < 3 || sanitizedId.length < 3) {
      return {
        valid: false,
        statusCode: 400,
        error: "Room name or meeting ID contains illegal characters or is too short.",
        serverEgressReady: false,
      };
    }

    // 3. Authorization Role Check
    const allowedRoles = ["admin", "organizer", "lead", "host", "member", "participant"];
    if (requesterRole && !allowedRoles.includes(requesterRole.toLowerCase())) {
      return {
        valid: false,
        statusCode: 403,
        error: "Forbidden: Unauthorized role for initiating recording.",
        serverEgressReady: false,
      };
    }

    // 4. Rate-limiting and Duplicate Egress Lock Check
    const now = Date.now();
    const existingLock = activeEgressLocks.get(sanitizedId);
    if (existingLock && now - existingLock.timestamp < EGRESS_LOCK_TTL_MS) {
      return {
        valid: false,
        statusCode: 429,
        error: `Duplicate Egress request rejected. An active recording lock is already held for meeting '${sanitizedId}'.`,
        existingEgressId: existingLock.egressId,
        serverEgressReady: false,
      };
    }

    // 5. Database Meeting & Room Verification
    try {
      let meeting = await db.meeting.findUnique({
        where: { id: sanitizedId },
      });

      if (!meeting) {
        // Auto-provision meeting record for instant/ad-hoc sessions if possible
        try {
          meeting = await db.meeting.create({
            data: {
              id: sanitizedId,
              title: `Meeting (${sanitizedRoom})`,
              date: new Date(),
              status: "ongoing",
              department: "General",
            },
          });
        } catch {
          meeting = null;
        }
      }

      if (!meeting) {
        return {
          valid: false,
          statusCode: 404,
          error: `Meeting with ID '${sanitizedId}' not found in registry.`,
          sanitizedRoomName: sanitizedRoom,
          sanitizedMeetingId: sanitizedId,
          serverEgressReady: false,
        };
      }

      // Check if room is already marked as recording in database
      const liveRoom = await db.liveKitRoom.findUnique({
        where: { meetingId: sanitizedId },
      });

      if (liveRoom?.recordingOn) {
        return {
          valid: false,
          statusCode: 409,
          error: "Meeting room is already being recorded.",
          sanitizedRoomName: sanitizedRoom,
          sanitizedMeetingId: sanitizedId,
          serverEgressReady: false,
        };
      }
    } catch (dbErr) {
      console.warn("[EgressPipelineValidator] DB check note:", dbErr);
    }

    // 6. Track Readiness Check (Zero-Track Race Condition Prevention)
    if (activeTrackCount < 1) {
      return {
        valid: false,
        statusCode: 422,
        error: "Unprocessable: No active audio or video tracks published. Egress requires at least 1 active media track.",
        sanitizedRoomName: sanitizedRoom,
        sanitizedMeetingId: sanitizedId,
        serverEgressReady: false,
      };
    }

    // 7. Verify LiveKit Credentials for Server-side Egress
    const hasLiveKitKeys = Boolean(
      config.livekitApiKey &&
        config.livekitApiSecret &&
        config.livekitWsUrl &&
        !config.livekitWsUrl.includes("demo.livekit.cloud")
    );

    return {
      valid: true,
      statusCode: 200,
      sanitizedRoomName: sanitizedRoom,
      sanitizedMeetingId: sanitizedId,
      serverEgressReady: hasLiveKitKeys,
    };
  }

  /**
   * Acquire mutex lock for an active egress session
   */
  public static acquireLock(meetingId: string, egressId?: string): void {
    activeEgressLocks.set(meetingId, {
      timestamp: Date.now(),
      egressId,
    });
  }

  /**
   * Release mutex lock when egress finishes or fails
   */
  public static releaseLock(meetingId: string): void {
    activeEgressLocks.delete(meetingId);
  }

  /**
   * Clear all active locks (useful for test resets)
   */
  public static clearAllLocks(): void {
    activeEgressLocks.clear();
  }
}
