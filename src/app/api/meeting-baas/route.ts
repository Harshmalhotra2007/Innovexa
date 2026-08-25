import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * MeetingBaas API Bot Dispatch Endpoint
 * Doc: https://docs.meetingbaas.com/api-reference/bots/join-a-meeting
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingId, meetingUrl, apiKey } = body;

    const baasApiKey = apiKey || process.env.MEETINGBAAS_API_KEY;

    if (!baasApiKey) {
      return NextResponse.json(
        {
          error: "Missing MeetingBaas API Key. Please provide MEETINGBAAS_API_KEY environment variable or pass apiKey in request body.",
        },
        { status: 400 }
      );
    }

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

    console.log(`[MeetingBaas] Dispatching bot to ${targetUrl} via MeetingBaas API...`);

    const baasRes = await fetch("https://api.meetingbaas.com/bots", {
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

    const baasData = await baasRes.json();

    if (!baasRes.ok) {
      console.error("[MeetingBaas] API error:", baasData);
      return NextResponse.json(
        { error: baasData.detail || baasData.message || "MeetingBaas API dispatch failed" },
        { status: baasRes.status }
      );
    }

    // Update agent status in database
    await db.aIAgent.upsert({
      where: { meetingId },
      create: {
        meetingId,
        status: "joining",
        joinedAt: new Date(),
        recordingUrl: `baas_${baasData.bot_id}`,
      },
      update: {
        status: "joining",
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      botId: baasData.bot_id,
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
