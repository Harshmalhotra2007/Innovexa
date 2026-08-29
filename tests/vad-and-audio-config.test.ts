import { isAudioChunkSpeech, normalizeSpeechLanguage, CLEAN_AUDIO_CONSTRAINTS } from "../src/lib/vad-analyzer";

describe("Voice Activity Detection (VAD) & Audio Config Tests", () => {
  it("should configure clean audio constraints without speech-distorting noiseSuppression or autoGainControl", () => {
    expect(CLEAN_AUDIO_CONSTRAINTS.echoCancellation).toBe(true);
    expect(CLEAN_AUDIO_CONSTRAINTS.noiseSuppression).toBe(false);
    expect(CLEAN_AUDIO_CONSTRAINTS.autoGainControl).toBe(false);
    expect(CLEAN_AUDIO_CONSTRAINTS.sampleRate).toBe(16000);
    expect(CLEAN_AUDIO_CONSTRAINTS.channelCount).toBe(1);
  });

  it("should normalize language codes correctly for SpeechRecognition and Whisper API", () => {
    // Default / Auto
    const autoNorm = normalizeSpeechLanguage("auto");
    expect(autoNorm.speechRecLang).toBe("en-US");
    expect(autoNorm.whisperLang).toBeUndefined();

    // English shorthand
    const enNorm = normalizeSpeechLanguage("en");
    expect(enNorm.speechRecLang).toBe("en-US");
    expect(enNorm.whisperLang).toBe("en");

    // Spanish shorthand
    const esNorm = normalizeSpeechLanguage("es");
    expect(esNorm.speechRecLang).toBe("es-ES");
    expect(esNorm.whisperLang).toBe("es");

    // Full BCP-47 tag
    const frNorm = normalizeSpeechLanguage("fr-FR");
    expect(frNorm.speechRecLang).toBe("fr-FR");
    expect(frNorm.whisperLang).toBe("fr");
  });

  it("should return false for tiny or invalid audio blobs in VAD check", async () => {
    const tinyBlob = new Blob(["short"], { type: "audio/webm" });
    const isSpeech = await isAudioChunkSpeech(tinyBlob);
    expect(isSpeech).toBe(false);
  });
});