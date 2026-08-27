import { SanitizedIceCandidate } from "./types";

/**
 * Validates and sanitizes ICE candidate objects to prevent prototype pollution or invalid SDP injections.
 */
export function sanitizeIceCandidate(candidate: any): SanitizedIceCandidate {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Invalid ICE candidate payload: Must be a non-null object.");
  }

  // Reject objects containing dangerous prototype properties
  if (
    "__proto__" in candidate ||
    "constructor" in candidate ||
    "prototype" in candidate
  ) {
    // Check if these are own properties
    if (Object.prototype.hasOwnProperty.call(candidate, "__proto__")) {
      throw new Error("Security Violation: Prototype pollution attempt detected in ICE candidate.");
    }
  }

  const candidateStr = typeof candidate.candidate === "string" ? candidate.candidate.trim() : "";
  if (!candidateStr && candidate.candidate !== "") {
    throw new Error("Invalid ICE candidate: 'candidate' string property is required.");
  }

  // Limit candidate string length to prevent memory buffer abuse
  if (candidateStr.length > 2048) {
    throw new Error("Invalid ICE candidate: Candidate string exceeds maximum allowed length (2048).");
  }

  const sdpMid =
    typeof candidate.sdpMid === "string"
      ? candidate.sdpMid.slice(0, 64)
      : candidate.sdpMid === null
      ? null
      : undefined;

  const sdpMLineIndex =
    typeof candidate.sdpMLineIndex === "number" &&
    Number.isInteger(candidate.sdpMLineIndex) &&
    candidate.sdpMLineIndex >= 0 &&
    candidate.sdpMLineIndex < 65536
      ? candidate.sdpMLineIndex
      : candidate.sdpMLineIndex === null
      ? null
      : undefined;

  const usernameFragment =
    typeof candidate.usernameFragment === "string"
      ? candidate.usernameFragment.slice(0, 128)
      : undefined;

  return {
    candidate: candidateStr,
    sdpMid,
    sdpMLineIndex,
    usernameFragment,
  };
}

/**
 * ICE Candidate Buffer & Sync Manager
 * Queues candidates received before remoteDescription is ready and drains them in FIFO order.
 */
export class IceCandidateBuffer {
  private buffer: SanitizedIceCandidate[] = [];
  private isRemoteDescriptionSet: boolean = false;
  private maxBufferSize: number;
  private totalBuffered: number = 0;
  private totalDrained: number = 0;

  constructor(maxBufferSize: number = 100) {
    this.maxBufferSize = Math.max(10, Math.min(maxBufferSize, 1000));
  }

  /**
   * Adds an ICE candidate to the buffer or executes immediately if remote description is ready.
   */
  public async addCandidate(
    rawCandidate: any,
    applyCandidateFn?: (candidate: SanitizedIceCandidate) => Promise<void>
  ): Promise<{ buffered: boolean; applied: boolean }> {
    const sanitized = sanitizeIceCandidate(rawCandidate);

    if (this.isRemoteDescriptionSet && applyCandidateFn) {
      await applyCandidateFn(sanitized);
      this.totalDrained++;
      return { buffered: false, applied: true };
    }

    if (this.buffer.length >= this.maxBufferSize) {
      // FIFO eviction to protect against memory exhaustion
      this.buffer.shift();
    }

    this.buffer.push(sanitized);
    this.totalBuffered++;
    return { buffered: true, applied: false };
  }

  /**
   * Sets the remote description readiness state.
   */
  public setRemoteDescriptionReady(isReady: boolean = true): void {
    this.isRemoteDescriptionSet = isReady;
  }

  /**
   * Drains all queued candidates in sequence using the provided handler.
   */
  public async drain(
    applyCandidateFn: (candidate: SanitizedIceCandidate) => Promise<void>
  ): Promise<{ drainedCount: number; errors: Array<{ candidate: SanitizedIceCandidate; error: any }> }> {
    this.isRemoteDescriptionSet = true;
    const candidatesToProcess = [...this.buffer];
    this.buffer = [];

    const errors: Array<{ candidate: SanitizedIceCandidate; error: any }> = [];
    let drainedCount = 0;

    for (const candidate of candidatesToProcess) {
      try {
        await applyCandidateFn(candidate);
        drainedCount++;
        this.totalDrained++;
      } catch (err) {
        errors.push({ candidate, error: err });
      }
    }

    return { drainedCount, errors };
  }

  /**
   * Clears the candidate queue.
   */
  public clear(): void {
    this.buffer = [];
    this.isRemoteDescriptionSet = false;
  }

  /**
   * Returns current buffer metrics.
   */
  public getMetrics() {
    return {
      bufferedCount: this.buffer.length,
      isRemoteDescriptionSet: this.isRemoteDescriptionSet,
      totalBuffered: this.totalBuffered,
      totalDrained: this.totalDrained,
    };
  }
}
