/**
 * WebRTC Architecture & Signaling Type Definitions
 */

export type PeerConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "reconnecting"
  | "closed";

export type SignalingMessageType =
  | "offer"
  | "answer"
  | "ice-candidate"
  | "join"
  | "leave"
  | "heartbeat"
  | "ping"
  | "pong";

export interface SanitizedIceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface SignalingMessage {
  type: SignalingMessageType;
  senderId: string;
  targetId?: string;
  roomId: string;
  timestamp: number;
  payload?: any;
  sdp?: string;
  candidate?: SanitizedIceCandidate;
  sequenceId?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterRatio: number; // 0 to 1
  timeoutMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  backoffFactor: 2,
  jitterRatio: 0.2,
  timeoutMs: 30000,
};

export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
  retryPolicy?: Partial<RetryPolicy>;
  enableDataChannel?: boolean;
  dataChannelLabel?: string;
}

export interface ConnectionTelemetry {
  connectionStatus: PeerConnectionStatus;
  retryCount: number;
  lastStateChange: number;
  bufferedCandidatesCount: number;
  drainedCandidatesCount: number;
  lastError: string | null;
}
