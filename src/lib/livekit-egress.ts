import { EgressClient, RoomServiceClient } from "livekit-server-sdk";
import { config } from "./config";
import { db } from "./db";
import { uploadToStorage } from "./storage";
import * as fs from "fs";

// Convert wss:// to https:// or ws:// to http:// for REST client connection
const getHttpUrl = (url: string) => {
  if (!url) return "";
  return url.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
};

const httpUrl = getHttpUrl(config.livekitWsUrl);

/**
 * Initialize LiveKit clients if credentials are provided
 */
export let egressClient = config.livekitApiKey && config.livekitApiSecret && httpUrl
  ? new EgressClient(httpUrl, config.livekitApiKey, config.livekitApiSecret)
  : null;

export function setEgressClient(client: any) {
  egressClient = client;
}

export let roomServiceClient = config.livekitApiKey && config.livekitApiSecret && httpUrl
  ? new RoomServiceClient(httpUrl, config.livekitApiKey, config.livekitApiSecret)
  : null;

/**
 * Wrapper to add timeout to Promise-returning functions
 * @param promiseFn - Function that returns a Promise
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that rejects with timeout error if timeoutMs is exceeded
 */
const withTimeout = <T>(promiseFn: () => Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promiseFn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

/**
 * Start a room composite egress to record the meeting
 * Returns the egress ID if successful, null otherwise
 */
export async function startRoomEgress(
  roomName: string,
  meetingId: string
): Promise<string | null> {
  if (!egressClient) {
    console.log("[LiveKit Egress] Egress client not configured. Using client-side recording fallback.");
    return null;
  }

  try {
    const fileName = `${meetingId}-${Date.now()}.mp4`;

    const fileOutput: Record<string, unknown> = {
      filepath: `/tmp/${fileName}`,
    };

    if (config.hasS3Storage && config.s3Bucket) {
      fileOutput.s3 = {
        accessKey: config.awsAccessKeyId,
        secret: config.awsSecretAccessKey,
        region: config.s3Region || "us-east-1",
        bucket: config.s3Bucket,
      };
    }

    // Add timeout to prevent hanging egress requests
    const info = await withTimeout(
      () => egressClient!.startRoomCompositeEgress(
        roomName,
        fileOutput as any,
        {
          layout: "grid",
          audioOnly: false,
        }
      ),
      10000 // 10 second timeout
    );

    console.log(`[LiveKit Egress] Started egress ${info.egressId} for room ${roomName}`);

    // Update room record with egress status
    await db.liveKitRoom.upsert({
      where: { meetingId },
      update: {
        recordingOn: true,
        status: "active",
      },
      create: {
        meetingId,
        roomName,
        recordingOn: true,
        status: "active",
      },
    }).catch(() => {});

    return info.egressId;
  } catch (error: any) {
    if (error.message?.includes("timed out")) {
      console.warn("[LiveKit Egress] Egress start timed out - server may be overloaded or unresponsive. Falling back to client-side recording.");
    } else {
      console.warn("[LiveKit Egress] Server egress start note (will fallback to client recording):", error);
    }
    return null;
  }
}

/**
 * Stop an active egress
 */
export async function stopEgress(egressId: string): Promise<boolean> {
  if (!egressClient) {
    return false;
  }

  try {
    await egressClient.stopEgress(egressId);
    console.log(`[LiveKit Egress] Stopped egress ${egressId}`);
    return true;
  } catch (error) {
    console.warn("[LiveKit Egress] Failed to stop egress:", error);
    return false;
  }
}

/**
 * Handle egress completed webhook from LiveKit
 */
export async function handleEgressCompleted(
  egressId: string,
  roomName: string,
  filePath: string,
  meetingId: string
): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[LiveKit Egress] Egress file ${filePath} not found on local disk`);
      return null;
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const extension = filePath.split(".").pop() || "mp4";
    const mimeType = extension === "mp4" ? "video/mp4" : extension === "webm" ? "video/webm" : "application/octet-stream";

    const storageUrl = await uploadToStorage(
      fileBuffer,
      meetingId,
      `meeting-recording-${Date.now()}.${extension}`,
      mimeType
    );

    console.log(`[LiveKit Egress] Uploaded recording to ${storageUrl}`);

    await fs.promises.unlink(filePath).catch(() => {});

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
      },
    });

    await db.meeting.update({
      where: { id: meetingId },
      data: { status: "completed" },
    }).catch(() => {});

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

/**
 * Setter to allow unit tests to mock the egress client.
 */
export function setEgressClientForTest(client: any) {
  egressClient = client;
}