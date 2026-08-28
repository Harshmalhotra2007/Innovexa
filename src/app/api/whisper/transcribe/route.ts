import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

const MAX_AUDIO_CHUNK_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

export async function runWhisperAudioTranscription({
  audioBuffer,
  mimeType = "audio/webm",
  chunkIndex = 0,
  language,
  promptHint,
}: {
  audioBuffer: Buffer;
  mimeType?: string;
  chunkIndex?: number;
  language?: string;
  promptHint?: string;
}): Promise<{ text: string; source: string }> {
  let transcribedText = "";
  let transcriptionSource = "none";

  if (!audioBuffer || audioBuffer.length <= 100) {
    return { text: "", source: "none" };
  }

  const groqApiKey = config.groqApiKey;
  const openaiApiKey = config.openaiApiKey;

  // Clean mimeType to standard extensions for Groq/OpenAI FormData
  const cleanMime = mimeType.split(";")[0].trim() || "audio/webm";
  const ext = cleanMime.includes("mp4")
    ? "mp4"
    : cleanMime.includes("wav")
    ? "wav"
    : cleanMime.includes("mp3") || cleanMime.includes("mpeg")
    ? "mp3"
    : cleanMime.includes("ogg")
    ? "ogg"
    : "webm";

  // 1. Try Groq Whisper (Ultra-fast real-time transcription)
  if (groqApiKey && groqApiKey.trim().length > 10) {
    try {
      const groqFormData = new FormData();
      const blob = new Blob([audioBuffer], { type: cleanMime });
      groqFormData.append("file", blob, `chunk_${chunkIndex}.${ext}`);
      groqFormData.append("model", "whisper-large-v3-turbo");
      if (language && language !== "auto") {
        groqFormData.append("language", language);
      }
      if (promptHint) {
        groqFormData.append("prompt", promptHint);
      }
      groqFormData.append("response_format", "json");

      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: groqFormData,
      });

      if (groqRes.ok) {
        const resJson = await groqRes.json();
        if (resJson.text && resJson.text.trim().length > 0) {
          transcribedText = resJson.text.trim();
          transcriptionSource = "groq_whisper_v3";
        }
      }
    } catch (groqErr) {
      console.warn("[Groq Whisper Notice]", groqErr);
    }
  }

  // 2. Try OpenAI Whisper (if Groq not configured or didn't return text)
  if (!transcribedText && openaiApiKey && openaiApiKey.trim().length > 10 && !openaiApiKey.includes("your-openai")) {
    try {
      const whisperFormData = new FormData();
      const blob = new Blob([audioBuffer], { type: cleanMime });
      whisperFormData.append("file", blob, `chunk_${chunkIndex}.${ext}`);
      whisperFormData.append("model", "whisper-1");
      if (language && language !== "auto") {
        whisperFormData.append("language", language);
      }
      if (promptHint) {
        whisperFormData.append("prompt", promptHint);
      }

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}` },
        body: whisperFormData,
      });

      if (whisperRes.ok) {
        const resJson = await whisperRes.json();
        if (resJson.text && resJson.text.trim().length > 0) {
          transcribedText = resJson.text.trim();
          transcriptionSource = "openai_whisper";
        }
      }
    } catch (whisperErr) {
      console.warn("[OpenAI Whisper Notice]", whisperErr);
    }
  }

  // Filter out silence, background noise hallucination, or dummy strings
  const lower = transcribedText.toLowerCase();
  const isHallucinatedSilence =
    !transcribedText ||
    lower.includes("thank you for watching") ||
    lower.includes("subscribe to my channel") ||
    lower.includes("subtitles by") ||
    lower.includes("capturing real-time audio") ||
    lower.includes("live stream segment");

  if (isHallucinatedSilence) {
    return { text: "", source: transcriptionSource };
  }

  return { text: transcribedText, source: transcriptionSource };
}

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

      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await runWhisperAudioTranscription({
        audioBuffer,
        mimeType: audioFile.type || "audio/webm",
        chunkIndex,
        language: language || undefined,
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
