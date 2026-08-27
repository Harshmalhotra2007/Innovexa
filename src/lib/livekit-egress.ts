import { EgressClient, RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { config } from "./config";
import { db } from "./db";
import { uploadToStorage } from "./storage";
import { Readable } from "stream";

import * as fs from "fs";

/**
 * Initialize LiveKit clients if credentials are provided
 */
const egressClient = config.livekitApiKey && config.livekitApiSecret
  ? new EgressClient(config.livekitWsUrl, config.livekitApiKey, config.livekitApiSecret)
  : null;

const roomServiceClient = config.livekitApiKey && config.livekitApiSecret
  ? new RoomServiceClient(config.livekitWsUrl, config.livekitApiKey, config.livekitApiSecret)
  : null;

/**
 * Start a room composite egress to record the meeting
 * Returns the egress ID if successful, null otherwise
 */
export async function startRoomEgress(
  roomName: string,
  meetingId: string
): Promise<string | null> {
  if (!egressClient) {
    console.warn("[LiveKit Egress] Egress client not configured");
    return null;
  }

  try {
    // Configure egress to upload to our storage via Upload endpoint
    // We'll use a custom approach: egress to a temporary location then copy to final storage
    const fileName = `${meetingId}-${Date.now()}.mp4`;

    const info = await egressClient.startRoomCompositeEgress(
      roomName,
      {
        filepath: `/tmp/${fileName}`,
      } as any,
      undefined,
      undefined,
      false // audioOnly
    );

    console.log(`[LiveKit Egress] Started egress ${info.egressId} for room ${roomName}`);

    // Store egress metadata for tracking
    // In a production system, you'd want to track this in a dedicated table
    // For now, we'll rely on webhook notifications

    return info.egressId;
  } catch (error) {
    console.error("[LiveKit Egress] Failed to start room egress:", error);
    return null;
  }
}

/**
 * Stop an active egress
 */
export async function stopEgress(egressId: string): Promise<boolean> {
  if (!egressClient) {
    console.warn("[LiveKit Egress] Egress client not configured");
    return false;
  }

  try {
    await egressClient.stopEgress(egressId);
    console.log(`[LiveKit Egress] Stopped egress ${egressId}`);
    return true;
  } catch (error) {
    console.error("[LiveKit Egress] Failed to stop egress:", error);
    return false;
  }
}

/**
 * Handle egress completed webhook from LiveKit
 * This would be called by your webhook handler when LiveKit POSTs to /api/webhooks/livekit/egress
 */
export async function handleEgressCompleted(
  egressId: string,
  roomName: string,
  filePath: string, // Path to the recorded file
  meetingId: string
): Promise<string | null> {
  try {
    // Read the recorded file
    const fileBuffer = await fs.promises.readFile(filePath);

    // Determine file type from extension or default to mp4
    const extension = filePath.split(".").pop() || "mp4";
    const mimeType = extension === "mp4" ? "video/mp4" :
                    extension === "webm" ? "video/webm" :
                    "application/octet-stream";

    // Upload to our storage system (S3/Supabase/local)
    const storageUrl = await uploadToStorage(
      fileBuffer,
      meetingId,
      `meeting-recording-${Date.now()}.${extension}`,
      mimeType
    );

    console.log(`[LiveKit Egress] Uploaded recording to ${storageUrl}`);

    // Clean up temporary file
    await fs.promises.unlink(filePath);

    return storageUrl;
  } catch (error) {
    console.error("[LiveKit Egress] Failed to handle completed egress:", error);
    return null;
  }
}

/**
 * Update meeting record with egress information and recording URL
 */
export async function updateMeetingWithRecording(
  meetingId: string,
  recordingUrl: string,
  egressId: string | null = null
): Promise<void> {
  try {
    await db.recording.create({
      data: {
        meetingId,
        url: recordingUrl,
        duration: 0,
        size: 0,
        format: "video/mp4",
      }
    });

    console.log(`[LiveKit Egress] Updated meeting ${meetingId} with recording URL`);
  } catch (error) {
    console.error("[LiveKit Egress] Failed to update meeting with recording:", error);
  }
}

/**
 * Check if LiveKit Egress is properly configured
 */
export function isEgressConfigured(): boolean {
  return !!egressClient;
}