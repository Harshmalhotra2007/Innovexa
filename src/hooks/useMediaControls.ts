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

  // Initialize local audio level monitoring for real-time VU meter
  const startAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
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

  // Request initial local user media for camera & mic
  const initLocalMedia = useCallback(async () => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        mediaStreamRef.current = stream;
        startAudioAnalyser(stream);
        setIsMicEnabled(true);
        setIsCameraEnabled(true);
      }
    } catch (err) {
      console.warn("[Local Media Init Note]", err);
    }
  }, [startAudioAnalyser]);

  // Toggle Microphone
  const toggleMic = useCallback(async () => {
    const nextState = !isMicEnabled;
    setIsMicEnabled(nextState);

    // If connected to LiveKit room
    if (room?.localParticipant) {
      try {
        await room.localParticipant.setMicrophoneEnabled(nextState);
      } catch (err) {
        console.warn("[LiveKit setMicrophoneEnabled Note]", err);
      }
    }

    // Toggle local stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
      if (!nextState) {
        setMicLevel(0);
      }
    }
  }, [isMicEnabled, room]);

  // Toggle Camera
  const toggleCamera = useCallback(async () => {
    const nextState = !isCameraEnabled;
    setIsCameraEnabled(nextState);

    // If connected to LiveKit room
    if (room?.localParticipant) {
      try {
        await room.localParticipant.setCameraEnabled(nextState);
      } catch (err) {
        console.warn("[LiveKit setCameraEnabled Note]", err);
      }
    }

    // Toggle local stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  }, [isCameraEnabled, room]);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    const nextState = !isScreenSharing;

    if (room?.localParticipant) {
      try {
        await room.localParticipant.setScreenShareEnabled(nextState);
        setIsScreenSharing(nextState);
      } catch (err) {
        console.warn("[LiveKit setScreenShareEnabled Note]", err);
      }
    } else {
      // Local fallback screen capture
      if (nextState) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
          };
          setIsScreenSharing(true);
        } catch {
          setIsScreenSharing(false);
        }
      } else {
        setIsScreenSharing(false);
      }
    }
  }, [isScreenSharing, room]);

  // Start In-Meeting Audio Recording
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    onRecordingStart?.();

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, [onRecordingStart]);

  // Stop In-Meeting Audio Recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    onRecordingStop?.();
  }, [onRecordingStop]);

  // Auto initialize local media stream on mount
  useEffect(() => {
    initLocalMedia();

    return () => {
      stopAudioAnalyser();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
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
