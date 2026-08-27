"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Room } from "livekit-client";

export interface MediaControlsOptions {
  room?: Room | null;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export function useMediaControls({
  room,
  onRecordingStart,
  onRecordingStop,
}: MediaControlsOptions = {}) {
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("excellent");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitMediaRef = useRef<boolean>(false);

  // Store callbacks in refs
  const onRecordingStartRef = useRef(onRecordingStart);
  onRecordingStartRef.current = onRecordingStart;
  const onRecordingStopRef = useRef(onRecordingStop);
  onRecordingStopRef.current = onRecordingStop;

  // Initialize local audio level monitoring for real-time VU meter
  const startAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);

        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn("[MediaControls AudioAnalyser Note]", err);
    }
  }, []);

  const stopAudioAnalyser = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicLevel(0);
  }, []);

  // Request initial local user media for camera & mic with fallback
  const initLocalMedia = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && navigator?.mediaDevices?.getUserMedia) {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
        } catch (videoErr) {
          console.warn("[Local Media Init] Video+Audio failed, trying audio-only:", videoErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
              },
            });
            setIsCameraEnabled(false);
          } catch (audioErr) {
            console.warn("[Local Media Init] Audio-only also unavailable:", audioErr);
            setIsMicEnabled(false);
            setIsCameraEnabled(false);
          }
        }

        if (stream) {
          mediaStreamRef.current = stream;
          startAudioAnalyser(stream);
          setIsMicEnabled(true);
          if (stream.getVideoTracks().length > 0) {
            setIsCameraEnabled(true);
          }
        }
      }
    } catch (err) {
      console.warn("[Local Media Init Note]", err);
    }
  }, [startAudioAnalyser]);

  // Toggle Microphone
  const toggleMic = useCallback(async () => {
    setIsMicEnabled((prev) => {
      const nextState = !prev;
      if (room?.localParticipant) {
        room.localParticipant.setMicrophoneEnabled(nextState).catch(() => {});
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = nextState;
        });
        if (!nextState) setMicLevel(0);
      }
      return nextState;
    });
  }, [room]);

  // Toggle Camera
  const toggleCamera = useCallback(async () => {
    setIsCameraEnabled((prev) => {
      const nextState = !prev;
      if (room?.localParticipant) {
        room.localParticipant.setCameraEnabled(nextState).catch(() => {});
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = nextState;
        });
      }
      return nextState;
    });
  }, [room]);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    setIsScreenSharing((prev) => {
      const nextState = !prev;
      if (room?.localParticipant) {
        room.localParticipant.setScreenShareEnabled(nextState).catch(() => {});
        return nextState;
      } else {
        if (nextState && typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
          navigator.mediaDevices
            .getDisplayMedia({ video: true })
            .then((screenStream) => {
              screenStream.getVideoTracks()[0].onended = () => {
                setIsScreenSharing(false);
              };
            })
            .catch(() => {
              setIsScreenSharing(false);
            });
          return true;
        }
        return false;
      }
    });
  }, [room]);

  // Start In-Meeting Audio Recording
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    onRecordingStartRef.current?.();

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop In-Meeting Audio Recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    onRecordingStopRef.current?.();
  }, []);

  // Auto initialize local media stream only once on mount
  useEffect(() => {
    if (!hasInitMediaRef.current) {
      hasInitMediaRef.current = true;
      initLocalMedia();
    }

    return () => {
      stopAudioAnalyser();
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        mediaStreamRef.current = null;
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, [initLocalMedia, stopAudioAnalyser]);

  return {
    isMicEnabled,
    isCameraEnabled,
    isScreenSharing,
    isRecording,
    recordingDuration,
    micLevel,
    connectionQuality,
    localMediaStream: mediaStreamRef.current,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    startRecording,
    stopRecording,
    setConnectionQuality,
  };
}
