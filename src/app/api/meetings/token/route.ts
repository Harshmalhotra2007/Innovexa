import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { roomName, participantName, meetingId, identity } = body;

    let targetRoomName = roomName;
    let targetMeetingId = meetingId;

    // If meetingId is provided without roomName or vice versa, resolve from database
    if (targetMeetingId && !targetRoomName) {
      const roomRecord = await db.liveKitRoom.findUnique({
        where: { meetingId: targetMeetingId },
      });
      targetRoomName = roomRecord?.roomName || `innovexa-meeting-${targetMeetingId}`;
    } else if (targetRoomName && !targetMeetingId) {
      // Check if roomName matches innovexa-meeting-[id] pattern or is registered in DB
      const match = targetRoomName.match(/^innovexa-meeting-(.+)$/);
      if (match) {
        targetMeetingId = match[1];
      } else {
        const roomRecord = await db.liveKitRoom.findUnique({
          where: { roomName: targetRoomName },
        });
        targetMeetingId = roomRecord?.meetingId;
      }
    }

    if (!targetRoomName) {
      return NextResponse.json(
        { error: "Missing roomName or meetingId" },
        { status: 400 }
      );
    }

    const name = participantName?.trim() || "Participant";
    const participantIdentity = identity?.trim() || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const apiKey = config.livekitApiKey || process.env.LIVEKIT_API_KEY || "devkey";
    const apiSecret = config.livekitApiSecret || process.env.LIVEKIT_API_SECRET || "secret_dev_key_innovexa_native";
    const serverUrl = config.livekitWsUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://demo.livekit.cloud";

    // Create LiveKit access token with room permissions
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name,
      ttl: "6h",
    });

    at.addGrant({
      roomJoin: true,
      room: targetRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    // If targetMeetingId exists, track room status in DB
    if (targetMeetingId) {
      try {
        await db.liveKitRoom.upsert({
          where: { meetingId: targetMeetingId },
          update: {
            status: "active",
            closedAt: null,
          },
          create: {
            meetingId: targetMeetingId,
            roomName: targetRoomName,
            status: "active",
          },
        });
      } catch (dbErr) {
        console.warn("[Token Route] DB record update skipped:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      serverUrl,
      participantToken: token,
      token,
      roomName: targetRoomName,
      meetingId: targetMeetingId,
      identity: participantIdentity,
      name,
      isConfigured: config.isLiveKitConfigured,
    });
  } catch (error: any) {
    console.error("[POST /api/meetings/token] Token generation failed:", error);
    return NextResponse.json(
      { error: error.message || "Generating token failed" },
      { status: 500 }
    );
  }
}
