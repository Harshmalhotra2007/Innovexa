import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { config } from "./config";

export function isLiveKitConfigured(): boolean {
  return config.isLiveKitConfigured;
}

export function getLiveKitWsUrl(): string {
  return config.livekitWsUrl;
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
  const apiKey = config.livekitApiKey || process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = config.livekitApiSecret || process.env.LIVEKIT_API_SECRET || "secret_dev_key_innovexa_native";

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
  const apiKey = config.livekitApiKey;
  const apiSecret = config.livekitApiSecret;
  const wsUrl = getLiveKitWsUrl();

  if (!apiKey || !apiSecret) {
    return null;
  }

  // Convert wss:// to https:// or ws:// to http:// for REST API endpoint
  const httpUrl = wsUrl.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}
