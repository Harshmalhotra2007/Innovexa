/**
 * Voice Activity Detection (VAD) and Audio Processing Utilities
 * Ensures uncorrupted speech signal capture and filters silent background chunks
 * to prevent Whisper AI hallucinations and nonsensical text generation.
 */

export const CLEAN_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,   // Prevents mic-to-speaker feedback loops
  noiseSuppression: false,  // Disables phase-canceling speech formant filters
  autoGainControl: false,   // Disables dynamic volume pumping and background noise amplification
  sampleRate: 16000,        // 16kHz sample rate optimal for Whisper model input
  channelCount: 1,          // Single mono channel for clean STT audio stream
};

/**
 * Normalizes language codes for browser SpeechRecognition and Whisper API.
 * Ensures BCP-47 locale compliance (e.g., "en-US", "es-ES", "hi-IN").
 */
export function normalizeSpeechLanguage(lang?: string): { speechRecLang: string; whisperLang?: string } {
  if (!lang || lang === "auto") {
    return { speechRecLang: "en-US", whisperLang: undefined };
  }

  const cleanLang = lang.trim().toLowerCase();

  if (cleanLang === "en") {
    return { speechRecLang: "en-US", whisperLang: "en" };
  }

  if (cleanLang.includes("-")) {
    const primary = cleanLang.split("-")[0];
    return { speechRecLang: lang, whisperLang: primary };
  }

  const bcpMap: Record<string, string> = {
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    hi: "hi-IN",
    zh: "zh-CN",
    ja: "ja-JP",
    pt: "pt-BR",
    it: "it-IT",
    ru: "ru-RU",
    ar: "ar-SA",
  };

  const speechRecLang = bcpMap[cleanLang] || `${cleanLang}-${cleanLang.toUpperCase()}`;
  return { speechRecLang, whisperLang: cleanLang };
}

/**
 * Client-side Voice Activity Detection (VAD).
 * Analyzes audio Blob energy (RMS) to determine whether active human speech is present.
 * If RMS < minRmsThreshold, returns false so silent/ambient noise chunks are NOT sent to Whisper.
 */
export async function isAudioChunkSpeech(
  blob: Blob,
  minRmsThreshold = 0.006
): Promise<boolean> {
  if (!blob || blob.size < 400) return false;

  try {
    if (typeof window === "undefined") return true;

    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return true;

    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);

    let sumSquare = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquare += channelData[i] * channelData[i];
    }

    const rms = Math.sqrt(sumSquare / channelData.length);
    await audioCtx.close().catch(() => {});

    const hasSpeech = rms >= minRmsThreshold;
    if (!hasSpeech) {
      console.log(`[VAD Analyzer] Speech absent in audio chunk (RMS: ${rms.toFixed(5)} < ${minRmsThreshold}). Skipping Whisper API dispatch.`);
    }

    return hasSpeech;
  } catch {
    // If Web Audio decoding fails (e.g. browser container mismatch), default to true
    return true;
  }
}