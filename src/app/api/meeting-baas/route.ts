import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";

/**
 * MeetingBaas v2 API Bot Dispatch Endpoint
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingId, meetingUrl, apiKey } = body;

    const baasApiKey = apiKey || process.env.MEETINGBAAS_API_KEY || DEFAULT_MEETINGBAAS_KEY;

    const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    const targetUrl = meetingUrl || (meeting?.agenda && meeting.agenda.includes("meet.google.com") ? meeting.agenda : null);

    if (!targetUrl) {
      return NextResponse.json(
        { error: "No valid Google Meet URL found for this meeting." },
        { status: 400 }
      );
    }

    const botName = process.env.BOT_NAME || "Innovexa Notetaker";
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://innovexa-innovexapu.vercel.app"}/api/meeting-baas/webhook`;

    console.log(`[MeetingBaas v2] Dispatching bot to ${targetUrl} via MeetingBaas API...`);

    // Try MeetingBaas v2 endpoint
    let baasRes = await fetch("https://api.meetingbaas.com/v2/bots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-meeting-baas-api-key": baasApiKey,
      },
      body: JSON.stringify({
        meeting_url: targetUrl,
        bot_name: botName,
        reserved: false,
        recording_mode: "speaker_view",
        entry_message: "This meeting is being recorded and transcribed by Innovexa.",
        webhook_url: webhookUrl,
        speech_to_text: {
          provider: "default",
        },
      }),
    });

    let baasData = await baasRes.json();

    if (!baasRes.ok && baasRes.status === 401 && baasData.error === "WrongPlatformApiKey") {
      // Fallback to v1 endpoint if v1 key is passed
      baasRes = await fetch("https://api.meetingbaas.com/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-meeting-baas-api-key": baasApiKey,
        },
        body: JSON.stringify({
          meeting_url: targetUrl,
          bot_name: botName,
          reserved: false,
          recording_mode: "speaker_view",
          entry_message: "This meeting is being recorded and transcribed by Innovexa.",
          webhook_url: webhookUrl,
          speech_to_text: {
            provider: "default",
          },
        }),
      });
      baasData = await baasRes.json();
    }

    if (!baasRes.ok) {
      console.error("[MeetingBaas] API error:", baasData);
      return NextResponse.json(
        { error: baasData.detail || baasData.message || baasData.error || "MeetingBaas API dispatch failed" },
        { status: baasRes.status }
      );
    }

    const botId = baasData.data?.bot_id || baasData.bot_id || "baas_bot";

    // Update agent status in database
    await db.aIAgent.upsert({
      where: { meetingId },
      create: {
        meetingId,
        status: "joining",
        joinedAt: new Date(),
        recordingUrl: `baas_${botId}`,
      },
      update: {
        status: "joining",
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      botId: botId,
      status: "joining",
      provider: "MeetingBaas",
      data: baasData,
    });
  } catch (error: any) {
    console.error("[MeetingBaas] Dispatch exception:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch MeetingBaas bot" },
      { status: 500 }
    );
  }
}
