import { config } from "@/lib/config";

export interface WhisperTranscriptionOptions {
  audioBuffer: Buffer;
  mimeType?: string;
  chunkIndex?: number;
  language?: string;
  promptHint?: string;
}

// Known hallucination phrases produced by Whisper on silent/background-noise audio
const WHISPER_HALLUCINATION_PATTERNS = [
  /subtitles by/i,
  /amara\.org/i,
  /thank you for watching/i,
  /thanks for watching/i,
  /please subscribe/i,
  /like and subscribe/i,
  /bye\./i,
  /goodbye\./i,
  /mbc/i,
  /so far so good/i,
  /screencastify/i,
  /captions by/i,
  /translated by/i,
  /^thanks\.$/i,
  /^thank you\.$/i,
  /^silence$/i,
  /^[.!\s\-\?]+$/,
];

function isHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return WHISPER_HALLUCINATION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export async function runWhisperAudioTranscription({
  audioBuffer,
  mimeType = "audio/webm",
  chunkIndex = 0,
  language,
  promptHint,
}: WhisperTranscriptionOptions): Promise<{ text: string; source: string }> {
  // Early exit for invalid audio
  if (!audioBuffer || audioBuffer.length < 200) {
    return { text: "", source: "none" };
  }

  console.log(`[Whisper Transcriber] Transcription attempt starting for chunk #${chunkIndex} (${audioBuffer.length} bytes, type: ${mimeType})`);

  const groqApiKey = config.groqApiKey?.trim();
  const openaiApiKey = config.openaiApiKey?.trim();

  // Validate API keys
  const hasGroqKey = Boolean(groqApiKey && groqApiKey.length > 10 && !groqApiKey.includes("your-groq"));
  const hasOpenAIKey = Boolean(openaiApiKey && openaiApiKey.length > 10 && !openaiApiKey.includes("your-openai"));

  if (!hasGroqKey && !hasOpenAIKey) {
    console.log("[Whisper Transcriber] Neither GROQ_API_KEY nor OPENAI_API_KEY is configured. Skipping cloud transcription.");
    return { text: "", source: "none" };
  }

  // Clean mimeType to standard extensions
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

  const effectiveLanguage = language && language !== "auto" ? language : "en";
  const effectivePrompt = promptHint || "Professional meeting transcription. Focus on spoken content, action items, decisions, and operational topics. Ignore background noise and non-speech audio.";

  // Try Groq Whisper first (faster)
  if (hasGroqKey) {
    console.log("[Whisper Transcriber] Using service: Groq (whisper-large-v3-turbo)");
    try {
      const result = await transcribeWithGroq(audioBuffer, cleanMime, ext, chunkIndex, effectiveLanguage, effectivePrompt);
      if (result.text) {
        if (isHallucination(result.text)) {
          console.log(`[Whisper Transcriber] Transcription filtered as hallucination: "${result.text}"`);
          return { text: "", source: "filtered_hallucination" };
        }
        console.log(`[Whisper Transcriber] Successful transcription result (${result.source}): "${result.text}"`);
        return result;
      }
    } catch (error) {
      const err = error as Error;
      console.warn("[Whisper Transcriber] Groq attempt failed:", err.message);
    }
  }

  // Fallback to OpenAI Whisper
  if (hasOpenAIKey) {
    console.log("[Whisper Transcriber] Using service: OpenAI (whisper-1)");
    try {
      const result = await transcribeWithOpenAI(audioBuffer, cleanMime, ext, chunkIndex, effectiveLanguage, effectivePrompt);
      if (result.text) {
        if (isHallucination(result.text)) {
          console.log(`[Whisper Transcriber] Transcription filtered as hallucination: "${result.text}"`);
          return { text: "", source: "filtered_hallucination" };
        }
        console.log(`[Whisper Transcriber] Successful transcription result (${result.source}): "${result.text}"`);
        return result;
      }
    } catch (error) {
      const err = error as Error;
      console.warn("[Whisper Transcriber] OpenAI attempt failed:", err.message);
    }
  }

  // If we get here, both services failed or returned empty text
  console.log(`[Whisper Transcriber] Chunk #${chunkIndex} processed with zero speech detected.`);
  return { text: "", source: "none" };
}

async function transcribeWithGroq(
  audioBuffer: Buffer,
  cleanMime: string,
  ext: string,
  chunkIndex: number,
  language: string,
  prompt: string
): Promise<{ text: string; source: string }> {
  const blob = new Blob([audioBuffer as unknown as BlobPart], { type: cleanMime });
  const formData = new FormData();

  formData.append("file", blob, `chunk_${chunkIndex}.${ext}`);
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", language);
  formData.append("prompt", prompt);
  formData.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.groqApiKey}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status}`);
  }

  const resJson = await res.json();
  const text = resJson.text?.trim() ?? "";

  return { text, source: text ? "groq_whisper_v3" : "none" };
}

async function transcribeWithOpenAI(
  audioBuffer: Buffer,
  cleanMime: string,
  ext: string,
  chunkIndex: number,
  language: string,
  prompt: string
): Promise<{ text: string; source: string }> {
  const blob = new Blob([audioBuffer as unknown as BlobPart], { type: cleanMime });
  const formData = new FormData();

  formData.append("file", blob, `chunk_${chunkIndex}.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("language", language);
  formData.append("prompt", prompt);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const resJson = await res.json();
  const text = resJson.text?.trim() ?? "";

  return { text, source: text ? "openai_whisper" : "none" };
}
