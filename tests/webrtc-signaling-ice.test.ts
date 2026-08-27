import { IceCandidateBuffer, sanitizeIceCandidate } from "../src/lib/webrtc/ice-candidate-buffer";
import { SignalingChannelSync, sanitizeSignalingMessage } from "../src/lib/webrtc/signaling-sync";

describe("WebRTC Signaling Sync & ICE Candidate Buffer", () => {
  describe("Security Pass & Sanitization", () => {
    test("rejects prototype pollution attempts in ICE candidate", () => {
      const maliciousPayload = JSON.parse('{"candidate":"candidate:1 1 UDP...","__proto__":{"polluted":true}}');
      expect(() => sanitizeIceCandidate(maliciousPayload)).toThrow(/Security Violation/);
    });

    test("rejects prototype pollution attempts in signaling message", () => {
      const maliciousPayload = JSON.parse('{"type":"offer","senderId":"user1","roomId":"room1","__proto__":{"polluted":true}}');
      expect(() => sanitizeSignalingMessage(maliciousPayload)).toThrow(/Security Violation/);
    });

    test("validates and sanitizes valid candidate", () => {
      const candidate = {
        candidate: "candidate:842163049 1 udp 1677729535 192.168.1.100 55000 typ host",
        sdpMid: "0",
        sdpMLineIndex: 0,
        usernameFragment: "ufrag123",
      };
      const sanitized = sanitizeIceCandidate(candidate);
      expect(sanitized.candidate).toBe(candidate.candidate);
      expect(sanitized.sdpMid).toBe("0");
      expect(sanitized.sdpMLineIndex).toBe(0);
      expect(sanitized.usernameFragment).toBe("ufrag123");
    });

    test("enforces length bounds on oversized payloads", () => {
      const oversizedCandidate = {
        candidate: "a".repeat(3000),
      };
      expect(() => sanitizeIceCandidate(oversizedCandidate)).toThrow(/exceeds maximum allowed length/);
    });
  });

  describe("ICE Candidate Buffering & Drain", () => {
    test("queues candidates when remote description is not set", async () => {
      const buffer = new IceCandidateBuffer(10);
      const res = await buffer.addCandidate({
        candidate: "candidate:1 1 udp 1 127.0.0.1 5000 typ host",
        sdpMid: "0",
      });

      expect(res.buffered).toBe(true);
      expect(res.applied).toBe(false);
      expect(buffer.getMetrics().bufferedCount).toBe(1);
    });

    test("drains buffered candidates in FIFO order when remote description is ready", async () => {
      const buffer = new IceCandidateBuffer(10);
      await buffer.addCandidate({ candidate: "candidate:1", sdpMid: "0" });
      await buffer.addCandidate({ candidate: "candidate:2", sdpMid: "0" });
      await buffer.addCandidate({ candidate: "candidate:3", sdpMid: "0" });

      expect(buffer.getMetrics().bufferedCount).toBe(3);

      const appliedOrder: string[] = [];
      const { drainedCount, errors } = await buffer.drain(async (cand) => {
        appliedOrder.push(cand.candidate);
      });

      expect(drainedCount).toBe(3);
      expect(errors.length).toBe(0);
      expect(appliedOrder).toEqual(["candidate:1", "candidate:2", "candidate:3"]);
      expect(buffer.getMetrics().bufferedCount).toBe(0);
    });

    test("applies candidates immediately if remote description is already ready", async () => {
      const buffer = new IceCandidateBuffer(10);
      buffer.setRemoteDescriptionReady(true);

      let applied = false;
      const res = await buffer.addCandidate(
        { candidate: "candidate:immediate", sdpMid: "0" },
        async (cand) => {
          applied = true;
          expect(cand.candidate).toBe("candidate:immediate");
        }
      );

      expect(res.buffered).toBe(false);
      expect(res.applied).toBe(true);
      expect(applied).toBe(true);
    });
  });

  describe("Signaling Channel Message Synchronization & Deduplication", () => {
    test("accepts valid signaling messages and rejects duplicates", () => {
      const sync = new SignalingChannelSync();
      const msg = {
        type: "offer",
        senderId: "user-1",
        roomId: "room-abc",
        sequenceId: 101,
        sdp: "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n",
        timestamp: Date.now(),
      };

      const res1 = sync.processIncoming(msg);
      expect(res1.accepted).toBe(true);
      expect(res1.message?.type).toBe("offer");

      // Duplicate attempt
      const res2 = sync.processIncoming(msg);
      expect(res2.accepted).toBe(false);
      expect(res2.error).toContain("Duplicate");
    });

    test("enqueues and flushes pending messages during negotiation locks", async () => {
      const sync = new SignalingChannelSync();
      sync.setNegotiating(true);

      const msg1 = {
        type: "ice-candidate",
        senderId: "user-2",
        roomId: "room-abc",
        candidate: { candidate: "candidate:test" },
        timestamp: Date.now(),
      };

      const res = sync.processIncoming(msg1);
      expect(res.accepted).toBe(true);

      if (res.message) {
        sync.enqueuePending(res.message);
      }

      let flushedCount = 0;
      await sync.flushPending(async (item) => {
        expect(item.type).toBe("ice-candidate");
        flushedCount++;
      });

      expect(flushedCount).toBe(1);
    });
  });
});
