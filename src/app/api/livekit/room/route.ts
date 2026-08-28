import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRoomServiceClient } from "@/lib/livekit";
import { startRoomEgress, stopEgress } from "@/lib/livekit-egress";
import { EgressPipelineValidator } from "@/lib/egress-pipeline-validator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId query parameter is required" }, { status: 400 });
    }

    const roomRecord = await db.liveKitRoom.findUnique({
      where: { meetingId },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            status: true,
            department: true,
          },
        },
      },
    });

    if (!roomRecord) {
      return NextResponse.json({
        exists: false,
        status: "idle",
      });
    }

    return NextResponse.json({
      exists: true,
      room: roomRecord,
    });
  } catch (error: unknown) {
    console.error("[LiveKit Room GET Error]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch room status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, roomName, meetingId, egressId, activeTrackCount = 1 } = body;
    const requesterRole = req.headers.get("x-user-role") || "organizer";

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const targetRoomName = roomName || `innovexa-meeting-${meetingId}`;

    if (action === "start_recording") {
      // Run full pipeline validation (sanitization, role auth, rate-limit lock, track check)
      const validation = await EgressPipelineValidator.validate({
        roomName: targetRoomName,
        meetingId,
        requesterRole,
        activeTrackCount,
      });

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: validation.error,
            existingEgressId: validation.existingEgressId,
          },
          { status: validation.statusCode }
        );
      }

      const activeEgressId = await startRoomEgress(
        validation.sanitizedRoomName!,
        validation.sanitizedMeetingId!
      );

      // Acquire active lock for Egress session
      EgressPipelineValidator.acquireLock(
        validation.sanitizedMeetingId!,
        activeEgressId || undefined
      );

      await db.liveKitRoom.upsert({
        where: { meetingId: validation.sanitizedMeetingId! },
        update: {
          recordingOn: true,
          status: "active",
        },
        create: {
          meetingId: validation.sanitizedMeetingId!,
          roomName: validation.sanitizedRoomName!,
          recordingOn: true,
          status: "active",
        },
      });

      return NextResponse.json({
        success: true,
        action: "start_recording",
        meetingId: validation.sanitizedMeetingId,
        roomName: validation.sanitizedRoomName,
        egressId: activeEgressId,
        serverEgressStarted: !!activeEgressId,
      });
    }

    if (action === "stop_recording") {
      if (egressId) {
        await stopEgress(egressId);
      }

      EgressPipelineValidator.releaseLock(meetingId);

      await db.liveKitRoom.update({
        where: { meetingId },
        data: {
          recordingOn: false,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        action: "stop_recording",
        meetingId,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[LiveKit Room POST Error]", error);
    const message = error instanceof Error ? error.message : "Failed to process room action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId query parameter is required" }, { status: 400 });
    }

    const roomRecord = await db.liveKitRoom.findUnique({
      where: { meetingId },
    });

    if (!roomRecord) {
      return NextResponse.json({ error: "LiveKit room not found" }, { status: 404 });
    }

    // Attempt to delete room from LiveKit server if room service is active
    const client = getRoomServiceClient();
    if (client && roomRecord.roomName) {
      try {
        await client.deleteRoom(roomRecord.roomName);
      } catch (clientErr) {
        console.warn("[LiveKit Room DELETE Warn] Server-side room cleanup note:", clientErr);
      }
    }

    // Update database record
    const updated = await db.liveKitRoom.update({
      where: { meetingId },
      data: {
        status: "closed",
        closedAt: new Date(),
        recordingOn: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Room closed successfully",
      room: updated,
    });
  } catch (error: unknown) {
    console.error("[LiveKit Room DELETE Error]", error);
    const message = error instanceof Error ? error.message : "Failed to delete LiveKit room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { meetingId, recordingOn, status } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const updateData: { recordingOn?: boolean; status?: string } = {};
    if (typeof recordingOn === "boolean") updateData.recordingOn = recordingOn;
    if (typeof status === "string") updateData.status = status;

    const updated = await db.liveKitRoom.update({
      where: { meetingId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      room: updated,
    });
  } catch (error: unknown) {
    console.error("[LiveKit Room PATCH Error]", error);
    const message = error instanceof Error ? error.message : "Failed to update room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
