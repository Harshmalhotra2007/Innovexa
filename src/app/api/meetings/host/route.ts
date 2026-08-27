import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateLiveKitToken } from "@/lib/livekit";
import { startRoomEgress } from "@/lib/livekit-egress";
import { config } from "@/lib/config";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, department, agenda } = body;

    const meetingTitle = title || `Instant AI Meeting (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const meetingDepartment = department || "Engineering";
    const meetingAgenda = agenda || "Instant AI Notetaker session launched by user.";

    // 1. Create instant Meeting record
    const meeting = await db.meeting.create({
      data: {
        title: meetingTitle,
        department: meetingDepartment,
        agenda: meetingAgenda,
        status: "In Progress",
        date: new Date(),
      },
    });

    // 2. Create LiveKit room and start recording (if LiveKit is configured)
    let token: string | undefined;
    let roomName: string | undefined;

    if (config.isLiveKitConfigured) {
      roomName = `innovexa-meeting-${meeting.id}`;
      token = await generateLiveKitToken({
        roomName,
        participantName: "Lead Organizer",
        participantIdentity: `host-${meeting.id}`,
        isPublisher: true,
      });

      // Upsert LiveKit room record
      await db.liveKitRoom.upsert({
        where: { meetingId: meeting.id },
        update: {
          status: "active",
          roomName,
          closedAt: null,
        },
        create: {
          meetingId: meeting.id,
          roomName,
          status: "active",
        },
      });

      // Start egress recording asynchronously
      startRoomEgress(roomName, meeting.id).catch((err) =>
        console.warn(`[POST /api/meetings/host] Async egress start failed for ${meeting.id}:`, err)
      );
    }

    return NextResponse.json({
      message: "Instant meeting created successfully",
      meetingId: meeting.id,
      status: meeting.status,
      roomName,
      token,
      isConfigured: config.isLiveKitConfigured,
    });
  } catch (error: any) {
    console.error("[POST /api/meetings/host]", error);
    return NextResponse.json(
      { error: error.message || "Failed to host instant meeting" },
      { status: 500 }
    );
  }
}
