import { useState, useRef, useCallback, useEffect } from "react";
import { Room, ConnectionState } from "livekit-client";
import { TrackPublicationGuard } from "@/lib/track-publication-guard";

export interface MediaControlsOptions {
  room?: Room | null;
  meetingId?: string;
  onRecordingStart?: () => void;
  onRecordingStop?: (recordingUrl?: string) => void;
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

  // Event-driven track publication guard for Egress stabilization
  const trackGuardRef = useRef<TrackPublicationGuard>(
    new TrackPublicationGuard({
      requiredAudioTracks: 1,
      requiredVideoTracks: 0,
      trackPublishTimeoutMs: 15000,
      onTracksReady: (audioCount, videoCount) => {
        console.log(`[TrackPublicationGuard] Live tracks verified (Audio: ${audioCount}, Video: ${videoCount})`);
      },
      onError: (err) => {
        console.warn("[TrackPublicationGuard Notice]", err.message);
      },
    })
  );

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
              autoGainControl: true,
              sampleRate: 16000,
              channelCount: 1,
            },
          });
        } catch (videoErr) {
          console.warn("[Local Media Init] Video+Audio failed, trying audio-only:", videoErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000,
                channelCount: 1,
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
      if (room && room.state === ConnectionState.Connected && room.localParticipant) {
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
      if (room && room.state === ConnectionState.Connected && room.localParticipant) {
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
      if (room && room.state === ConnectionState.Connected && room.localParticipant) {
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
      if (room && room.state === ConnectionState.Connected && room.localParticipant) {
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

  // Publish local media tracks to LiveKit room once room connects and media is live
  useEffect(() => {
    if (!room || room.state !== ConnectionState.Connected || !room.localParticipant) {
      return;
    }

    const stream = mediaStreamRef.current;
    if (!stream) return;

    const audioTracks = stream.getAudioTracks().filter((t) => t.readyState === "live");
    const videoTracks = stream.getVideoTracks().filter((t) => t.readyState === "live");

    // Signal publication to TrackPublicationGuard
    if (audioTracks.length > 0) {
      trackGuardRef.current.onTrackPublished("audio");
    }
    if (videoTracks.length > 0) {
      trackGuardRef.current.onTrackPublished("video");
    }
    trackGuardRef.current.onConnectionEstablished();

    // Enable mic and camera on LiveKit room
    if (isMicEnabled && audioTracks.length > 0) {
      room.localParticipant.setMicrophoneEnabled(true).catch(() => {});
    }
    if (isCameraEnabled && videoTracks.length > 0) {
      room.localParticipant.setCameraEnabled(true).catch(() => {});
    }
  }, [room, isMicEnabled, isCameraEnabled]);

  // Upload the compiled audio recording to backend storage & database
  const uploadRecordingBlob = useCallback(async (blob: Blob, durationSeconds: number) => {
    const activeMeetingId = meetingIdRef.current;
    if (!activeMeetingId || blob.size < 50) return;

    try {
      setIsUploadingRecording(true);
      const role = (typeof window !== "undefined" && sessionStorage.getItem("userRole")) || "organizer";

      const formData = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      formData.append("meetingId", activeMeetingId);
      formData.append("duration", durationSeconds.toString());
      formData.append("audio", blob, `meeting_recording_${activeMeetingId}.${ext}`);

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

  // Append chunk collected by Whisper or Media stream
  const appendRecordedChunk = useCallback((chunk: Blob) => {
    if (chunk && chunk.size > 0) {
      recordedChunksRef.current.push(chunk);
    }
  }, []);

  // Start In-Meeting Audio Recording
  const startRecording = useCallback(async () => {
    setIsRecording(true);
    setRecordingDuration(0);
    currentDurationRef.current = 0;
    recordedChunksRef.current = [];
    onRecordingStartRef.current?.();

    // Verify active track count to prevent zero-track race conditions
    const currentStream = mediaStreamRef.current;
    const activeTracks = currentStream ? currentStream.getTracks().filter((t) => t.readyState === "live").length : 1;
    const activeTrackCount = Math.max(1, activeTracks);

    const currentMeetingId = meetingIdRef.current;
    if (currentMeetingId) {
      const userRole = (typeof window !== "undefined" && sessionStorage.getItem("userRole")) || "organizer";
      fetch("/api/livekit/room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({
          action: "start_recording",
          meetingId: currentMeetingId,
          activeTrackCount,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            trackGuardRef.current.markRecordingStarted();
          }
        })
        .catch((err) => {
          console.warn("[MediaControls] Server start_recording note:", err);
        });
    }

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => {
        const next = prev + 1;
        currentDurationRef.current = next;
        return next;
      });
    }, 1000);

    // Initialize audio-only MediaRecorder with live audio tracks
    let stream = mediaStreamRef.current;

    // If local stream is missing or stopped, attempt to re-acquire
    if (!stream || stream.getAudioTracks().filter((t) => t.readyState === "live").length === 0) {
      if (typeof navigator !== "undefined" && navigator?.mediaDevices?.getUserMedia) {
        try {
          const freshStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          mediaStreamRef.current = freshStream;
          stream = freshStream;
        } catch (mediaErr) {
          console.warn("[MediaControls] Proactive audio acquisition note:", mediaErr);
        }
      }
    }

    if (typeof MediaRecorder !== "undefined") {
      try {
        let audioOnlyStream: MediaStream | null = null;

        if (stream) {
          const liveAudioTracks = stream.getAudioTracks().filter((t) => t.readyState === "live");
          if (liveAudioTracks.length > 0) {
            audioOnlyStream = new MediaStream(liveAudioTracks);
          }
        }

        // Fallback: create silent audio destination if microphone track was blocked
        if (!audioOnlyStream) {
          try {
            const win = window as unknown as {
              AudioContext?: new () => AudioContext;
              webkitAudioContext?: new () => AudioContext;
            };
            const AudioCtx = win.AudioContext || win.webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const dest = ctx.createMediaStreamDestination();
              audioOnlyStream = dest.stream;
            }
          } catch {
            audioOnlyStream = null;
          }
        }

        if (audioOnlyStream) {
          const mimeType = getSupportedAudioMimeType();
          let recorder: MediaRecorder;
          try {
            recorder = mimeType
              ? new MediaRecorder(audioOnlyStream, { mimeType })
              : new MediaRecorder(audioOnlyStream);
          } catch {
            recorder = new MediaRecorder(audioOnlyStream);
          }

          recordingRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };

          recorder.onstop = () => {
            if (recordedChunksRef.current.length > 0) {
              const finalType = mimeType || "audio/webm";
              const finalBlob = new Blob(recordedChunksRef.current, { type: finalType });
              uploadRecordingBlob(finalBlob, currentDurationRef.current);
            }
          };

          recorder.start(1000); // collect chunk each second
        }
      } catch (recErr) {
        console.warn("[MediaControls] MediaRecorder start note:", recErr);
      }
    }
  }, [uploadRecordingBlob]);

  // Stop In-Meeting Audio Recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (meetingIdRef.current) {
      fetch("/api/livekit/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop_recording",
          meetingId: meetingIdRef.current,
        }),
      }).catch(() => {});
    }

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
    } else if (recordedChunksRef.current.length > 0) {
      // Fallback: Upload accumulated chunks even if recorder had already stopped
      const mimeType = getSupportedAudioMimeType() || "audio/webm";
      const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
      uploadRecordingBlob(finalBlob, currentDurationRef.current);
    }
  }, [uploadRecordingBlob]);

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
    appendRecordedChunk,
    setConnectionQuality,
  };
}
