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

        const res = await fetch("/api/whisper/transcribe", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.segment) {
            setSegments((prev) => [...prev, data.segment]);
            setChunksTranscribed((prev) => prev + 1);
            onSegmentReceivedRef.current?.(data.segment);
          }
        } else {
          console.warn(`[Whisper Pipeline] Chunk #${index} received non-200 status`);
        }
      } catch (err: unknown) {
        console.warn("[Whisper Pipeline Dispatch Notice]", err);
      }
    },
    [meetingId, speakerHint]
  );

  // Start real-time audio chunk recording and transcription
  const startPipeline = useCallback(() => {
    if (isPipelineActiveRef.current) return;
    setLastError(null);

    const stream = mediaStream;
    if (!stream) {
      console.log("[Whisper Pipeline] Waiting for MediaStream before starting...");
      return;
    }

    try {
      // Isolate active audio tracks so video tracks don't trigger MediaRecorder format errors
      const audioTracks = stream.getAudioTracks().filter((t) => t.readyState === "live");
      if (audioTracks.length === 0) {
        console.log("[Whisper Pipeline] No live audio tracks found yet on stream");
        return;
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      const mimeType = getSupportedAudioMimeType();

      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(audioOnlyStream, { mimeType })
          : new MediaRecorder(audioOnlyStream);
      } catch (mimeErr) {
        console.warn("[Whisper Pipeline] Falling back to default MediaRecorder constructor:", mimeErr);
        recorder = new MediaRecorder(audioOnlyStream);
      }

      mediaRecorderRef.current = recorder;
      chunkIndexRef.current = 0;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 50 && isPipelineActiveRef.current) {
          onAudioChunkRecordedRef.current?.(event.data);
          const currentIndex = chunkIndexRef.current++;
          sendChunkToWhisper(event.data, currentIndex);
        }
      };

      recorder.onerror = (event) => {
        console.warn("[Whisper Pipeline MediaRecorder Warning]", event);
      };

      recorder.start(chunkIntervalMs);
      isPipelineActiveRef.current = true;
      setIsTranscribing(true);
      console.log("🎙️ [Whisper Pipeline] Audio capture started successfully");
    } catch (err: unknown) {
      console.warn("[Whisper Pipeline Notice]", err);
      // Suppress unhandled start errors from showing red alert if stream is transitioning
      setLastError(null);
    }
  }, [mediaStream, chunkIntervalMs, sendChunkToWhisper]);

  // Stop the recording pipeline
  const stopPipeline = useCallback(() => {
    isPipelineActiveRef.current = false;
    setIsTranscribing(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn("[Whisper Pipeline Stop Note]", err);
      }
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
