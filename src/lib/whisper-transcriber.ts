import { config } from "@/lib/config";

export interface WhisperTranscriptionOptions {
  audioBuffer: Buffer;
  mimeType?: string;
  chunkIndex?: number;
  language?: string;
  promptHint?: string;
}

export async function runWhisperAudioTranscription({
  audioBuffer,
  mimeType = "audio/webm",
  chunkIndex = 0,
  language,
  promptHint,
}: WhisperTranscriptionOptions): Promise<{ text: string; source: string }> {
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
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: cleanMime });
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
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: cleanMime });
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
