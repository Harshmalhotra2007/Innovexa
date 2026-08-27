import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateLiveKitToken, getLiveKitWsUrl, isLiveKitConfigured } from "@/lib/livekit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { meetingId, participantName, participantIdentity } = body;

    if (!meetingId || typeof meetingId !== "string") {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    // Verify meeting exists in DB
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
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

    return NextResponse.json({
      success: true,
      token,
      roomName,
      wsUrl,
      isConfigured,
      participant: {
        identity,
        name,
      },
    });
  } catch (error: unknown) {
    console.error("[LiveKit Token API Error]", error);
    const message = error instanceof Error ? error.message : "Failed to generate LiveKit room token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
