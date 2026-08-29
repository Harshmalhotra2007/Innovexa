import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateLiveKitToken, getLiveKitWsUrl, isLiveKitConfigured } from "@/lib/livekit";
import { apiHandler, ApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return apiHandler(async (req) => {
    const body = await req.json().catch(() => ({}));
    const { meetingId, participantName, participantIdentity } = body;

    if (!meetingId || typeof meetingId !== "string") {
      throw new ApiError(400, "meetingId is required");
    }

    // Verify meeting exists in DB
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const roomName = `innovexa-meeting-${meetingId}`;
    const name = participantName?.trim() || "Operations Lead";
    const identity = participantIdentity?.trim() || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Upsert or retrieve active LiveKit room record in database
    await db.liveKitRoom.upsert({
      where: { meetingId },
      update: {
        status: "active",
        closedAt: null,
      },
      create: {
        meetingId,
        roomName,
        status: "active",
      },
    });

    // Generate JWT access token for WebRTC connection
    const token = await generateLiveKitToken({
      roomName,
      participantName: name,
      participantIdentity: identity,
      isPublisher: true,
    });

    const wsUrl = getLiveKitWsUrl();
    const isConfigured = isLiveKitConfigured();

    return {
      success: true,
      token,
      roomName,
      wsUrl,
      isConfigured,
      participant: {
        identity,
        name,
      },
    };
  });
}
