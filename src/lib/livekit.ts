import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export function isLiveKitConfigured(): boolean {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;
  return Boolean(apiKey && apiSecret && wsUrl);
}

export function getLiveKitWsUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "wss://demo.livekit.cloud";
}

export interface GenerateTokenParams {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  isPublisher?: boolean;
}

/**
 * Generates a signed LiveKit AccessToken JWT for room connection.
 */
export async function generateLiveKitToken({
  roomName,
  participantName,
  participantIdentity,
  isPublisher = true,
}: GenerateTokenParams): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret_for_demo_mode_dev_jwt_signing_key_32_bytes";

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: "6h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: isPublisher,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Returns a LiveKit RoomServiceClient instance if credentials are valid.
 */
export function getRoomServiceClient(): RoomServiceClient | null {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = getLiveKitWsUrl();

  if (!apiKey || !apiSecret) {
    return null;
  }

  // Convert wss:// to https:// or ws:// to http:// for REST API endpoint
  const httpUrl = wsUrl.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}
