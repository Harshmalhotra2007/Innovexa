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
}

export function useWhisperPipeline({
  meetingId,
  mediaStream,
  speakerHint = "Operations Lead",
  chunkIntervalMs = 4000,
  onSegmentReceived,
}: UseWhisperPipelineOptions) {
  const [segments, setSegments] = useState<WhisperSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [chunksSent, setChunksSent] = useState<number>(0);
  const [chunksTranscribed, setChunksTranscribed] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const isPipelineActiveRef = useRef<boolean>(false);

  // Send an audio blob chunk to the Whisper API route
  const sendChunkToWhisper = useCallback(
    async (blob: Blob, index: number) => {
      try {
        setChunksSent((prev) => prev + 1);

        const formData = new FormData();
        formData.append("audio", blob, `whisper_chunk_${index}.webm`);
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
            onSegmentReceived?.(data.segment);
          }
        } else {
          console.warn(`[Whisper Pipeline] Chunk #${index} received non-200 status`);
        }
      } catch (err: unknown) {
        console.error("[Whisper Pipeline Dispatch Error]", err);
        setLastError(err instanceof Error ? err.message : "Error dispatching audio chunk");
      }
    },
    [meetingId, speakerHint, onSegmentReceived]
  );

  // Start real-time audio chunk recording and transcription
  const startPipeline = useCallback(() => {
    if (isPipelineActiveRef.current) return;
    setLastError(null);

    let stream = mediaStream;
    if (!stream) {
      console.warn("[Whisper Pipeline] No MediaStream provided yet to record");
      return;
    }

    try {
      // Ensure the stream has an active audio track
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("[Whisper Pipeline] No audio tracks found on MediaStream");
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunkIndexRef.current = 0;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 100 && isPipelineActiveRef.current) {
          const currentIndex = chunkIndexRef.current++;
          sendChunkToWhisper(event.data, currentIndex);
        }
      };

      recorder.start(chunkIntervalMs);
      isPipelineActiveRef.current = true;
      setIsTranscribing(true);
    } catch (err: unknown) {
      console.error("[Whisper Pipeline Start Error]", err);
      setLastError(err instanceof Error ? err.message : "Failed to initialize MediaRecorder");
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
