import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isLiveKitConfigured, getLiveKitWsUrl } from "@/lib/livekit";
import { config } from "@/lib/config";

/**
 * Handle LiveKit webhooks for room and egress events.
 * This endpoint receives POST requests from LiveKit when events occur.
 *
 * Expected webhook body structure (based on LiveKit documentation):
 * {
 *   "event": "room_started" | "room_ended" | "egress_started" | "egress_completed" | "egress_failed",
 *   "roomId": "...",
 *   "egressId": "...", // for egress events
 *   "output": [ // for egress_completed
 *     {
 *       "file": {
 *         "url": "https://example.com/recording.mp4"
 *       }
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify webhook signature if LiveKit is configured with a webhook secret
    // For now, we assume the webhook is coming from our trusted LiveKit server.
    // In production, you should validate the signature using a shared secret.

    const body = await request.json();

    const { event, roomId, egressId, output } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: "Missing roomId in webhook" },
        { status: 400 }
      );
    }

    // Find the meeting associated with this LiveKit room
    const livekitRoom = await db.liveKitRoom.findFirst({
      where: { roomName: roomId },
      select: {
        meetingId: true,
        meeting: {
          select: { id: true }
        }
      }
    });

    if (!livekitRoom) {
      console.warn(`[LiveKit Webhook] No meeting found for room ${roomId}`);
      // Not an error - the room might be from a different system or test
      return NextResponse.json({ success: true });
    }

    const meetingId = livekitRoom.meetingId;

    // Handle room events
    if (event === "room_started") {
      // Room is now active - we could update status if needed
      await db.liveKitRoom.update({
        where: { roomName: roomId },
        data: { status: "active" }
      });
    } else if (event === "room_ended") {
      // Room has ended - update status
      await db.liveKitRoom.update({
        where: { roomName: roomId },
        data: { status: "closed", closedAt: new Date() }
      });
    }

    // Handle egress events
    if (event === "egress_completed" && output && Array.isArray(output)) {
      // We expect at least one output file
      const fileInfo = output[0]?.file;
      if (fileInfo && fileInfo.url) {
        const recordingUrl = fileInfo.url;

        // Update the meeting with the recording URL
        await db.meeting.update({
          where: { id: meetingId },
          data: {
            recordingUrl,
            // Optionally update status to indicate recording is ready
            // status: "recording_available"
          }
        });

        console.log(`[LiveKit Webhook] Updated meeting ${meetingId} with recording URL: ${recordingUrl}`);
      } else {
        console.warn(`[LiveKit Webhook] No file info in egress completed event for room ${roomId}`);
      }
    } else if (event === "egress_failed") {
      console.error(`[LiveKit Webhook] Egress failed for room ${roomId}:`, body);
      // Optionally, we could trigger a fallback recording or alert
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[LiveKit Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}