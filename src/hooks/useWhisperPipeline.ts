"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface WhisperSegment {
  speaker: string;
  text: string;
  timestamp: string;
  order: number;
  type?: string;
}

export interface UseWhisperPipelineOptions {
  meetingId: string;
  mediaStream?: MediaStream | null;
  speakerHint?: string;
  chunkIntervalMs?: number;
  onSegmentReceived?: (segment: WhisperSegment) => void;
  onAudioChunkRecorded?: (chunk: Blob) => void;
}

function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [subIndex: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognitionInstance;

interface WindowWithSpeechRec extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function useWhisperPipeline({
  meetingId,
  mediaStream,
  speakerHint = "Operations Lead",
  chunkIntervalMs = 4000,
  onSegmentReceived,
  onAudioChunkRecorded,
}: UseWhisperPipelineOptions) {
  const [segments, setSegments] = useState<WhisperSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [chunksSent, setChunksSent] = useState<number>(0);
  const [chunksTranscribed, setChunksTranscribed] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const isPipelineActiveRef = useRef<boolean>(false);

  const onSegmentReceivedRef = useRef(onSegmentReceived);
  onSegmentReceivedRef.current = onSegmentReceived;
  const onAudioChunkRecordedRef = useRef(onAudioChunkRecorded);
  onAudioChunkRecordedRef.current = onAudioChunkRecorded;

  // Send an audio blob chunk to the Whisper API route
  const sendChunkToWhisper = useCallback(
    async (blob: Blob, index: number) => {
      try {
        setChunksSent((prev) => prev + 1);

        const formData = new FormData();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        formData.append("audio", blob, `whisper_chunk_${index}.${ext}`);
        formData.append("meetingId", meetingId);
        formData.append("chunkIndex", index.toString());
        formData.append("speakerHint", speakerHint);
        formData.append("language", "en");

        const res = await fetch("/api/whisper/transcribe", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.segment && data.segment.text) {
            setSegments((prev) => {
              // Avoid duplicate segments if native speech recognition already caught it
              const exists = prev.some((s) => s.text === data.segment.text);
              if (exists) return prev;
              return [...prev, data.segment];
            });
            setChunksTranscribed((prev) => prev + 1);
            onSegmentReceivedRef.current?.(data.segment);
          }
        }
      } catch (err: unknown) {
        console.warn("[Whisper Pipeline Notice]", err);
      }
    },
    [meetingId, speakerHint]
  );

  // Sync real-time text recognized via SpeechRecognition
  const handleRecognizedText = useCallback(
    async (text: string) => {
      if (!text || text.trim().length === 0) return;
      const cleanText = text.trim();

      const currentIndex = chunkIndexRef.current++;
      const totalSecs = currentIndex * 4;
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const timestamp = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      const segment: WhisperSegment = {
        speaker: speakerHint,
        text: cleanText,
        timestamp,
        order: currentIndex + 1,
        type:
          cleanText.toLowerCase().includes("decision") || cleanText.toLowerCase().includes("approve")
            ? "decision"
            : cleanText.toLowerCase().includes("action item") || cleanText.toLowerCase().includes("will do")
            ? "action"
            : "discussion",
      };

      setSegments((prev) => [...prev, segment]);
      setChunksTranscribed((prev) => prev + 1);
      onSegmentReceivedRef.current?.(segment);

      // Save segment in database
      fetch("/api/whisper/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          chunkIndex: currentIndex,
          speakerHint,
          text: cleanText,
          language: "en",
        }),
      }).catch(() => {});
    },
    [meetingId, speakerHint]
  );

  // Start real-time audio chunk recording and transcription
  const startPipeline = useCallback(() => {
    if (isPipelineActiveRef.current) return;
    setLastError(null);

    const stream = mediaStream;
    if (!stream) {
      return;
    }

    try {
      // 1. Start browser Native Speech Recognition if available
      if (typeof window !== "undefined") {
        const win = window as WindowWithSpeechRec;
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = "en-US";

            recognition.onresult = (event: ISpeechRecognitionEvent) => {
              const current = event.resultIndex;
              const transcript = event.results[current]?.[0]?.transcript;
              if (transcript && transcript.trim().length > 0) {
                // Basic filtering for common browser STT artifacts
                const cleanTranscript = transcript.trim();
                const lower = cleanTranscript.toLowerCase();

                // Skip obvious artifacts
                if (
                  lower === "you" ||
                  lower === "you." ||
                  lower === "thank you" ||
                  lower === "thank you." ||
                  lower === "bye" ||
                  lower === "bye." ||
                  lower.includes("auto-generated") ||
                  lower.includes("auto generated") ||
                  lower.includes("auto-generated captions") ||
                  lower.includes("auto generated captions") ||
                  lower.includes("captions by") ||
                  lower.includes("generated by") ||
                  lower.includes("whisper") ||
                  lower.includes("transcription") ||
                  lower === "auto" ||
                  lower === "auto-generated." ||
                  lower === "auto generated." ||
                  lower.startsWith("auto ") ||
                  lower.startsWith("generated ") ||
                  lower.includes("subtitle") ||
                  lower.includes("caption")
                ) {
                  console.log(`[SpeechRecognition] Filtered artifact: "${cleanTranscript}"`);
                  return;
                }

                handleRecognizedText(cleanTranscript);
              }
            };

            recognition.onerror = (event: { error: string }) => {
              console.warn("[SpeechRecognition Notice]", event.error);
            };

            recognition.onend = () => {
              // Auto restart if pipeline is still active
              if (isPipelineActiveRef.current) {
                try {
                  recognition.start();
                } catch {}
              }
            };

            recognition.start();
            recognitionRef.current = recognition;
          } catch (recInitErr) {
            console.warn("[SpeechRecognition Init Notice]", recInitErr);
          }
        }
      }

      // 2. Start audio track isolation and MediaRecorder for streaming chunks & audio buffering
      const audioTracks = stream.getAudioTracks().filter((t) => t.readyState === "live");
      if (audioTracks.length > 0) {
        const audioOnlyStream = new MediaStream(audioTracks);
        const mimeType = getSupportedAudioMimeType();

        let recorder: MediaRecorder;
        try {
          recorder = mimeType
            ? new MediaRecorder(audioOnlyStream, { mimeType })
            : new MediaRecorder(audioOnlyStream);
        } catch {
          recorder = new MediaRecorder(audioOnlyStream);
        }

        mediaRecorderRef.current = recorder;
        chunkIndexRef.current = 0;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 500 && isPipelineActiveRef.current) {
            onAudioChunkRecordedRef.current?.(event.data);
            const currentIndex = chunkIndexRef.current++;
            // Send each chunk directly - MediaRecorder produces properly formatted segments
            sendChunkToWhisper(event.data, currentIndex);
          }
        };

        recorder.start(chunkIntervalMs);
      }

      isPipelineActiveRef.current = true;
      setIsTranscribing(true);
    } catch (err: unknown) {
      console.warn("[Whisper Pipeline Notice]", err);
      setLastError(null);
    }
  }, [mediaStream, chunkIntervalMs, sendChunkToWhisper, handleRecognizedText]);

  // Stop the recording pipeline
  const stopPipeline = useCallback(() => {
    isPipelineActiveRef.current = false;
    setIsTranscribing(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPipeline();
    };
  }, [stopPipeline]);

  return {
    segments,
    isTranscribing,
    chunksSent,
    chunksTranscribed,
    lastError,
    startPipeline,
    stopPipeline,
    clearSegments: () => setSegments([]),
  };
}
