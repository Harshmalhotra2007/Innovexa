import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRoomServiceClient } from "@/lib/livekit";

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
