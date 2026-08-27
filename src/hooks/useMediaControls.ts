"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Room } from "livekit-client";

export interface MediaControlsOptions {
  room?: Room | null;
  meetingId?: string;
  onRecordingStart?: () => void;
  onRecordingStop?: (recordingUrl?: string) => void;
}

export function useMediaControls({
  room,
  meetingId,
  onRecordingStart,
  onRecordingStop,
}: MediaControlsOptions = {}) {
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenMediaStream, setScreenMediaStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isUploadingRecording, setIsUploadingRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("excellent");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitMediaRef = useRef<boolean>(false);

  // Dedicated media recorder for session saving
  const recordingRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const currentDurationRef = useRef<number>(0);

  // Store callbacks in refs
  const onRecordingStartRef = useRef(onRecordingStart);
  onRecordingStartRef.current = onRecordingStart;
  const onRecordingStopRef = useRef(onRecordingStop);
  onRecordingStopRef.current = onRecordingStop;
  const meetingIdRef = useRef(meetingId);
  meetingIdRef.current = meetingId;

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
    if (isScreenSharing) {
      // Stop screen sharing
      if (room?.localParticipant) {
        room.localParticipant.setScreenShareEnabled(false).catch(() => {});
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenMediaStream(null);
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      if (room?.localParticipant) {
        try {
          await room.localParticipant.setScreenShareEnabled(true);
          setIsScreenSharing(true);
        } catch (err) {
          console.warn("[LiveKit setScreenShareEnabled Note]", err);
        }
      } else if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = screenStream;
          setScreenMediaStream(screenStream);
          setIsScreenSharing(true);

          screenStream.getVideoTracks()[0].onended = () => {
            if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach((t) => t.stop());
              screenStreamRef.current = null;
            }
            setScreenMediaStream(null);
            setIsScreenSharing(false);
          };
        } catch {
          setIsScreenSharing(false);
          setScreenMediaStream(null);
        }
      }
    }
  }, [isScreenSharing, room]);

  // Upload the compiled audio recording to backend storage & database
  const uploadRecordingBlob = useCallback(async (blob: Blob, durationSeconds: number) => {
    const activeMeetingId = meetingIdRef.current;
    if (!activeMeetingId || blob.size < 100) return;

    try {
      setIsUploadingRecording(true);
      const role = (typeof window !== "undefined" && sessionStorage.getItem("userRole")) || "organizer";

      const formData = new FormData();
      formData.append("meetingId", activeMeetingId);
      formData.append("duration", durationSeconds.toString());
      formData.append("audio", blob, `meeting_recording_${activeMeetingId}.webm`);

      const res = await fetch("/api/recordings/upload", {
        method: "POST",
        headers: {
          "x-user-role": role,
        },
        body: formData,
      });

      if (res.ok) {
        const recordingData = await res.json();
        console.log("[MediaControls] Recording uploaded successfully:", recordingData);
        onRecordingStopRef.current?.(recordingData.url);

        // Auto trigger action items extraction
        fetch(`/api/meetings/${activeMeetingId}/extract-action-items`, { method: "POST" }).catch(() => {});
      } else {
        const errText = await res.text();
        console.warn("[MediaControls] Recording upload note:", errText);
      }
    } catch (uploadErr) {
      console.warn("[MediaControls] Recording upload error:", uploadErr);
    } finally {
      setIsUploadingRecording(false);
    }
  }, []);

  // Start In-Meeting Audio Recording
  const startRecording = useCallback(() => {
    if (recordingRecorderRef.current && recordingRecorderRef.current.state === "recording") {
      return;
    }

    setIsRecording(true);
    setRecordingDuration(0);
    currentDurationRef.current = 0;
    recordedChunksRef.current = [];
    onRecordingStartRef.current?.();

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => {
        const next = prev + 1;
        currentDurationRef.current = next;
        return next;
      });
    }, 1000);

    // Initialize MediaRecorder for full recording
    const stream = mediaStreamRef.current;
    if (stream && typeof MediaRecorder !== "undefined") {
      try {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const recorder = new MediaRecorder(stream, { mimeType });
        recordingRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
            uploadRecordingBlob(finalBlob, currentDurationRef.current);
          }
        };

        recorder.start(1000); // chunk every 1 second
      } catch (recErr) {
        console.warn("[MediaControls] MediaRecorder start note:", recErr);
      }
    }
  }, [uploadRecordingBlob]);

  // Stop In-Meeting Audio Recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    if (recordingRecorderRef.current && recordingRecorderRef.current.state !== "inactive") {
      try {
        recordingRecorderRef.current.stop();
      } catch (err) {
        console.warn("[MediaControls Stop Recording Note]", err);
      }
      recordingRecorderRef.current = null;
    }
  }, []);

  // Auto initialize local media stream only once on mount
  useEffect(() => {
    if (!hasInitMediaRef.current) {
      hasInitMediaRef.current = true;
      initLocalMedia();
    }

    return () => {
      stopAudioAnalyser();
      if (recordingRecorderRef.current && recordingRecorderRef.current.state !== "inactive") {
        try {
          recordingRecorderRef.current.stop();
        } catch (e) {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        mediaStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        try {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        screenStreamRef.current = null;
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
    screenMediaStream,
    isRecording,
    isUploadingRecording,
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
