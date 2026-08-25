import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * MeetingBaas Webhook Handler
 * Receives bot lifecycle events, mp4/wav audio recordings, and transcripts from MeetingBaas.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("[MeetingBaas Webhook] Event received:", payload.event, payload.bot_id);

    const { event, bot_id, mp4, transcript, bot_data } = payload;

    if (!bot_id) {
      return NextResponse.json({ received: true });
    }

    // Find agent by meetingId or recordingUrl reference
    const agent = await db.aIAgent.findFirst({
      where: { recordingUrl: { contains: bot_id } },
    });

    if (agent) {
      if (event === "bot.status_change") {
        const status = payload.data?.status;
        if (status === "in_call" || status === "joining") {
          await db.aIAgent.update({
            where: { id: agent.id },
            data: { status: "recording" },
          });
        }
      } else if (event === "complete" || event === "bot.completed") {
        // Formatted transcript segments
        const formattedTranscript = (transcript || []).map((t: any) => ({
          speaker: t.speaker || "Participant",
          text: t.words?.map((w: any) => w.word).join(" ") || t.text || "",
          timestamp: t.start_time || "00:00:00",
        }));

        await db.aIAgent.update({
          where: { id: agent.id },
          data: {
            status: "completed",
            recordingUrl: mp4 || agent.recordingUrl,
            transcript: formattedTranscript as any,
            summary: payload.summary || `Executive Summary generated via MeetingBaas for bot ${bot_id}.`,
            updatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[MeetingBaas Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
