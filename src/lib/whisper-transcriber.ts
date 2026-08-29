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

  const effectiveLanguage = language && language !== "auto" ? language : "en";
  const effectivePrompt = promptHint || "English meeting transcript with clear speech, operational alignment, decisions, and action items.";

  // 1. Try Groq Whisper (Ultra-fast real-time transcription)
  if (groqApiKey && groqApiKey.trim().length > 10) {
    try {
      const groqFormData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: cleanMime });
      groqFormData.append("file", blob, `chunk_${chunkIndex}.${ext}`);
      groqFormData.append("model", "whisper-large-v3-turbo");
      groqFormData.append("language", effectiveLanguage);
      groqFormData.append("prompt", effectivePrompt);
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
      whisperFormData.append("language", effectiveLanguage);
      whisperFormData.append("prompt", effectivePrompt);

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

  // Enhanced filtering for hallucinations, silence, and nonsense transcriptions
  const lower = transcribedText.toLowerCase().trim();

  // Check for empty or very short transcriptions
  if (!transcribedText || transcribedText.trim().length < 2) {
    console.log(`[Whisper Transcriber] Empty or too short transcription: "${transcribedText}"`);
    return { text: "", source: transcriptionSource };
  }

  // Check for common hallucination patterns
  const isCommonHallucination =
    lower === "you" ||
    lower === "you." ||
    lower === "thank you." ||
    lower === "thank you" ||
    lower === "bye." ||
    lower === "bye" ||
    lower.includes("thank you for watching") ||
    lower.includes("subscribe to my channel") ||
    lower.includes("subtitles by") ||
    lower.includes("capturing real-time audio") ||
    lower.includes("live stream segment") ||
    lower.includes("amara.org") ||
    lower.includes("http://") ||
    lower.includes("https://") ||
    lower.includes("auto-generated") ||
    lower.includes("auto generated");

  // Check for repetitive patterns (common in Whisper hallucinations)
  const words = lower.split(/\s+/);
  const isRepetitive = words.length >= 3 &&
    new Set(words).size <= Math.max(2, Math.floor(words.length * 0.3)); // More than 70% repetition

  // Check for gibberish (high ratio of non-alphabetic characters or unusual patterns)
  const alphaRatio = [...lower].filter(c => c.match(/[a-z\s]/i)).length / lower.length;
  const isLikelyGibberish = alphaRatio < 0.6 && lower.length > 10; // Less than 60% alphabetic/space chars

  const isHallucinatedSilence = isCommonHallucination || isRepetitive || isLikelyGibberish;

  if (isHallucinatedSilence) {
    console.log(`[Whisper Transcriber] Filtered hallucination/nonsense: "${transcribedText}" (common: ${isCommonHallucination}, repetitive: ${isRepetitive}, gibberish: ${isLikelyGibberish})`);
    return { text: "", source: transcriptionSource };
  }

  // Log successful transcription for debugging
  if (transcribedText.length > 0) {
    console.log(`[Whisper Transcriber] Successful transcription (${transcriptionSource}): "${transcribedText.substring(0, 100)}${transcribedText.length > 100 ? '...' : ''}"`);
  }

  return { text: transcribedText, source: transcriptionSource };
}
