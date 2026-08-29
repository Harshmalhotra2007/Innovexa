import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runWhisperAudioTranscription } from "@/lib/whisper-transcriber";

export const dynamic = "force-dynamic";

const MAX_AUDIO_CHUNK_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

export async function POST(req: Request) {
  try {
    const { meetingId, chunkIndex = 0, speakerHint = "Operations Lead", language = "en", text: rawDirectText } =
      req.headers.get("content-type")?.includes("application/json")
        ? await req.json()
        : Object.fromEntries(await req.formData());

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    // Handle direct text input (bypass Whisper)
    if (rawDirectText && rawDirectText.trim().length > 0) {
      return processTranscriptionResult(
        meetingId,
        chunkIndex,
        rawDirectText.trim(),
        speakerHint,
        "native_stt"
      );
    }

    // Handle audio file input
    const audioFile = req.headers.get("content-type")?.includes("application/json")
      ? null
      : (await req.formData()).get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({
        success: true,
        meetingId,
        chunkIndex,
        isSilent: true,
        text: "",
        segment: null,
      });
    }

    // Validate audio file size
    if (audioFile.size > MAX_AUDIO_CHUNK_SIZE) {
      return NextResponse.json({
        error: "Audio chunk exceeds maximum 25MB limit"
      }, { status: 400 });
    }

    // Process audio through Whisper
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const { text: transcribedText, source: transcriptionSource } = await runWhisperAudioTranscription({
      audioBuffer,
      mimeType: audioFile.type || "audio/webm",
      chunkIndex,
      language,
      promptHint: "Professional meeting transcription. Focus on spoken content, action items, decisions, and operational topics. Ignore background noise and non-speech audio."
    });

    return processTranscriptionResult(
      meetingId,
      chunkIndex,
      transcribedText,
      speakerHint,
      transcriptionSource
    );
  } catch (error: unknown) {
    console.error("[Whisper Transcribe Route Error]", error);
    const message = error instanceof Error ? error.message : "Failed to transcribe audio chunk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function processTranscriptionResult(
  meetingId: string,
  chunkIndex: number,
  transcribedText: string,
  speakerHint: string,
  transcriptionSource: string
) {
  // Calculate timestamp mm:ss (4 seconds per chunk)
  const totalSecs = chunkIndex * 4;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const timestamp = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // Handle empty transcription
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
  const segmentType = determineSegmentType(transcribedText);

  const newSegment = {
    speaker,
    text: transcribedText.trim(),
    timestamp,
    order: chunkIndex + 1,
    type: segmentType,
  };

  // Save to database (fire and forget)
  saveSegmentToDb(meetingId, newSegment);
  updateAgentTranscript(meetingId, newSegment);

  return NextResponse.json({
    success: true,
    meetingId,
    chunkIndex,
    source: transcriptionSource,
    text: newSegment.text,
    segment: newSegment,
  });
}

function determineSegmentType(text: string): "decision" | "action" | "discussion" {
  const lower = text.toLowerCase();

  if (lower.includes("decision") || lower.includes("approve") || lower.includes("agreed")) {
    return "decision";
  }

  if (
    lower.includes("action item") ||
    lower.includes("will do") ||
    lower.includes("assigned") ||
    lower.includes("todo") ||
    lower.includes("need to") ||
    lower.includes("responsible")
  ) {
    return "action";
  }

  return "discussion";
}

async function saveSegmentToDb(meetingId: string, segment: any) {
  try {
    await db.meetingSegment.create({
      data: {
        meetingId,
        speaker: segment.speaker,
        text: segment.text,
        timestamp: segment.timestamp,
        order: segment.order,
        type: segment.type,
      },
    });
  } catch (error) {
    console.warn("[MeetingSegment Create Note]", error);
  }
}

async function updateAgentTranscript(meetingId: string, segment: any) {
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
          transcript: [...currentTranscript, segment],
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.warn("[AIAgent Transcript Update Note]", error);
  }
}
