import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { triggerAIAgent } from "@/lib/ai-agent-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const authHeader = req.headers.get("Authorization");

    const apiKey = config.livekitApiKey;
    const apiSecret = config.livekitApiSecret;

    let event: any;

    if (apiKey && apiSecret && authHeader) {
      try {
        const receiver = new WebhookReceiver(apiKey, apiSecret);
        event = await receiver.receive(rawBody, authHeader);
      } catch (authErr) {
        console.warn("[LiveKit Webhook] Signature verification failed or missing, parsing fallback payload:", authErr);
        event = JSON.parse(rawBody || "{}");
      }
    } else {
      event = JSON.parse(rawBody || "{}");
    }

    const eventType = event.event;
    const room = event.room;
    const egressInfo = event.egressInfo;

    console.log(`[LiveKit Webhook] Received event: ${eventType} for room: ${room?.name || egressInfo?.roomName}`);

    // Resolve meetingId from roomName (pattern: innovexa-meeting-[id])
    const roomName = room?.name || egressInfo?.roomName;
    let meetingId: string | null = null;

    if (roomName) {
      const match = roomName.match(/^innovexa-meeting-(.+)$/);
      if (match) {
        meetingId = match[1];
      } else {
        const roomRecord = await db.liveKitRoom.findUnique({
          where: { roomName },
        });
        meetingId = roomRecord?.meetingId || null;
      }
    }

    if (eventType === "room_finished" && meetingId) {
      await db.liveKitRoom.update({
        where: { meetingId },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
      }).catch(() => {});

      await db.meeting.update({
        where: { id: meetingId },
        data: { status: "Processing" },
      }).catch(() => {});

      // Trigger AI Agent
      await triggerAIAgent(meetingId).catch((err) =>
        console.warn(`[LiveKit Webhook] Auto AI trigger for meeting ${meetingId}:`, err)
      );
    }

    if (eventType === "egress_ended" && meetingId) {
      const fileUrl = egressInfo?.fileResults?.[0]?.url || egressInfo?.fileResults?.[0]?.filename;
      if (fileUrl) {
        await db.recording.create({
          data: {
            meetingId,
            url: fileUrl,
            duration: Math.round(egressInfo.duration || 0),
            size: 0,
            format: "video/mp4",
          },
        }).catch(() => {});
      }

      await triggerAIAgent(meetingId).catch(() => {});
    }

    return NextResponse.json({ success: true, event: eventType });
  } catch (error: any) {
    console.error("[LiveKit Webhook Error]", error);
    return NextResponse.json(
      { error: error.message || "LiveKit webhook error" },
      { status: 500 }
    );
  }
}