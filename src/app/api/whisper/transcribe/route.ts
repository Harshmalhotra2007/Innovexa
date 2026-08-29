import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runWhisperAudioTranscription } from "@/lib/whisper-transcriber";

export const dynamic = "force-dynamic";

const MAX_AUDIO_CHUNK_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)
const MIN_AUDIO_CHUNK_SIZE = 500; // Minimum 500 bytes to avoid sending empty/silent chunks

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let meetingId = "";
    let chunkIndex = 0;
    let speakerHint = "Operations Lead";
    let audioFile: File | null = null;
    let rawDirectText = "";
    let language = "";

    if (contentType.includes("application/json")) {
      const jsonBody = await req.json().catch(() => ({}));
      meetingId = jsonBody.meetingId || "";
      chunkIndex = jsonBody.chunkIndex || 0;
      speakerHint = jsonBody.speakerHint || "Operations Lead";
      rawDirectText = jsonBody.text || "";
      language = jsonBody.language || "";
    } else {
      const formData = await req.formData();
      meetingId = (formData.get("meetingId") as string) || "";
      chunkIndex = parseInt((formData.get("chunkIndex") as string) || "0", 10);
      speakerHint = (formData.get("speakerHint") as string) || "Operations Lead";
      audioFile = formData.get("audio") as File | null;
      rawDirectText = (formData.get("directText") as string) || "";
      language = (formData.get("language") as string) || "";
    }

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    // Calculate timestamp mm:ss
    const totalSecs = chunkIndex * 4;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timestamp = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    let transcribedText = rawDirectText ? rawDirectText.trim() : "";
    let transcriptionSource = rawDirectText ? "native_stt" : "none";

    // If audioFile is provided and no directText, run through Whisper transcription engine
    if (!transcribedText && audioFile) {
      if (audioFile.size > MAX_AUDIO_CHUNK_SIZE) {
        return NextResponse.json({ error: "Audio chunk exceeds maximum 25MB limit" }, { status: 400 });
      }

      // Skip very small chunks that are likely silence or noise
      if (audioFile.size < MIN_AUDIO_CHUNK_SIZE) {
        return NextResponse.json({
          success: true,
          meetingId,
          chunkIndex,
          isSilent: true,
          text: "",
          segment: null,
        });
      }

      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await runWhisperAudioTranscription({
        audioBuffer,
        mimeType: audioFile.type || "audio/webm",
        chunkIndex,
        language: language || "en",
        promptHint: "Meeting conversation, action items, decisions, operational alignment.",
      });

      transcribedText = result.text;
      transcriptionSource = result.source;
    }

    if (!transcribedText || transcribedText.trim().length === 0) {
      return NextResponse.json({
        success: true,
        meetingId,
        chunkIndex,
        isSilent: true,
        text: "",
        segment: null,
      });
    }

    const speaker = speakerHint || "Participant";
    const segmentType =
      transcribedText.toLowerCase().includes("decision") || transcribedText.toLowerCase().includes("approve")
        ? "decision"
        : transcribedText.toLowerCase().includes("action item") || transcribedText.toLowerCase().includes("will do") || transcribedText.toLowerCase().includes("assigned")
        ? "action"
        : "discussion";

    const newSegment = {
      speaker,
      text: transcribedText,
      timestamp,
      order: chunkIndex + 1,
      type: segmentType,
    };

    // Save segment in MeetingSegment database model
    try {
      await db.meetingSegment.create({
        data: {
          meetingId,
          speaker: newSegment.speaker,
          text: newSegment.text,
          timestamp: newSegment.timestamp,
          order: newSegment.order,
          type: newSegment.type,
        },
      });
    } catch (dbSegErr) {
      console.warn("[MeetingSegment Create Note]", dbSegErr);
    }

    // Update AIAgent transcript JSON record atomically
    try {
      const existingAgent = await db.aIAgent.findUnique({ where: { meetingId } });
      if (existingAgent) {
        const currentTranscript = Array.isArray(existingAgent.transcript)
          ? (existingAgent.transcript as any[])
          : [];

        await db.aIAgent.update({
          where: { meetingId },
          data: {
            status: "recording",
            transcript: [...currentTranscript, newSegment],
            updatedAt: new Date(),
          },
        });
      }
    } catch (agentErr) {
      console.warn("[AIAgent Transcript Update Note]", agentErr);
    }

    return NextResponse.json({
      success: true,
      meetingId,
      chunkIndex,
      source: transcriptionSource,
      text: transcribedText,
      segment: newSegment,
    });
  } catch (error: unknown) {
    console.error("[Whisper Transcribe Route Error]", error);
    const message = error instanceof Error ? error.message : "Failed to transcribe audio chunk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
