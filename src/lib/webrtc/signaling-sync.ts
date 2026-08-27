import { SignalingMessage, SignalingMessageType } from "./types";
import { sanitizeIceCandidate } from "./ice-candidate-buffer";

const VALID_MESSAGE_TYPES: Set<SignalingMessageType> = new Set([
  "offer",
  "answer",
  "ice-candidate",
  "join",
  "leave",
  "heartbeat",
  "ping",
  "pong",
]);

/**
 * Validates and sanitizes inbound signaling messages to prevent prototype pollution and malformed payloads.
 */
export function sanitizeSignalingMessage(raw: any): SignalingMessage {
  if (!raw || typeof raw !== "object") {
    throw new Error("Signaling message must be a non-null object.");
  }

  // Security pass: Prototype pollution check
  if (Object.prototype.hasOwnProperty.call(raw, "__proto__")) {
    throw new Error("Security Violation: Prototype pollution in signaling payload.");
  }

  const type = raw.type as SignalingMessageType;
  if (!type || !VALID_MESSAGE_TYPES.has(type)) {
    throw new Error(`Invalid signaling message type: ${String(type)}`);
  }

  const senderId = typeof raw.senderId === "string" ? raw.senderId.trim().slice(0, 128) : "";
  if (!senderId) {
    throw new Error("Missing or invalid 'senderId' in signaling message.");
  }

  const roomId = typeof raw.roomId === "string" ? raw.roomId.trim().slice(0, 128) : "";
  if (!roomId) {
    throw new Error("Missing or invalid 'roomId' in signaling message.");
  }

  const targetId = typeof raw.targetId === "string" ? raw.targetId.trim().slice(0, 128) : undefined;
  const timestamp = typeof raw.timestamp === "number" && raw.timestamp > 0 ? raw.timestamp : Date.now();
  const sequenceId = typeof raw.sequenceId === "number" ? raw.sequenceId : undefined;

  let sdp: string | undefined = undefined;
  if (type === "offer" || type === "answer") {
    if (typeof raw.sdp !== "string" || !raw.sdp.trim()) {
      throw new Error(`Signaling message of type '${type}' must include a valid 'sdp' string.`);
    }
    // Bound SDP size to 1MB
    if (raw.sdp.length > 1024 * 1024) {
      throw new Error("SDP payload exceeds maximum allowed size (1MB).");
    }
    sdp = raw.sdp;
  }

  let candidate = undefined;
  if (type === "ice-candidate") {
    candidate = sanitizeIceCandidate(raw.candidate || raw.payload?.candidate || raw.payload);
  }

  return {
    type,
    senderId,
    targetId,
    roomId,
    timestamp,
    sequenceId,
    sdp,
    candidate,
    payload: raw.payload,
  };
}

/**
 * Signaling Channel Synchronizer
 * Manages ordered processing of signaling messages, deduplicates messages, and handles SDP negotiation readiness.
 */
export class SignalingChannelSync {
  private processedSequenceIds: Set<string> = new Set();
  private pendingQueue: SignalingMessage[] = [];
  private isNegotiating: boolean = false;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 500) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Processes and sanitizes an incoming raw signaling payload.
   * Filters out duplicates and enforces ordering.
   */
  public processIncoming(
    rawMessage: any
  ): { accepted: boolean; message?: SignalingMessage; error?: string } {
    try {
      const message = sanitizeSignalingMessage(rawMessage);

      // Deduplication based on senderId + sequenceId or senderId + timestamp + type
      const messageKey = message.sequenceId !== undefined
        ? `${message.senderId}:${message.sequenceId}`
        : `${message.senderId}:${message.type}:${message.timestamp}`;

      if (this.processedSequenceIds.has(messageKey)) {
        return { accepted: false, error: "Duplicate signaling message discarded" };
      }

      if (this.processedSequenceIds.size >= this.maxHistorySize) {
        // Clear oldest keys
        const firstKey = this.processedSequenceIds.values().next().value;
        if (firstKey) this.processedSequenceIds.delete(firstKey);
      }

      this.processedSequenceIds.add(messageKey);
      return { accepted: true, message };
    } catch (err: any) {
      return { accepted: false, error: err.message || "Failed to process signaling message" };
    }
  }

  /**
   * Enqueues a message if negotiation is in progress.
   */
  public enqueuePending(msg: SignalingMessage): void {
    this.pendingQueue.push(msg);
  }

  /**
   * Drains pending queue with the provided callback.
   */
  public async flushPending(handler: (msg: SignalingMessage) => Promise<void>): Promise<number> {
    const queue = [...this.pendingQueue];
    this.pendingQueue = [];
    let count = 0;

    for (const msg of queue) {
      await handler(msg);
      count++;
    }

    return count;
  }

  public setNegotiating(negotiating: boolean): void {
    this.isNegotiating = negotiating;
  }

  public isCurrentlyNegotiating(): boolean {
    return this.isNegotiating;
  }

  public clear(): void {
    this.processedSequenceIds.clear();
    this.pendingQueue = [];
    this.isNegotiating = false;
  }
}
