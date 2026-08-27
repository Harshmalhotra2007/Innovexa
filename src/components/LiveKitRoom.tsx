"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { useMediaControls } from "@/hooks/useMediaControls";
import { useWhisperPipeline } from "@/hooks/useWhisperPipeline";
import { ParticipantTile } from "./ParticipantTile";
import { MediaControlHUD } from "./MediaControlHUD";
import {
  Video,
  Radio,
  FileText,
  Sparkles,
  Users,
  Shield,
  AlertCircle,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";

export interface LiveKitRoomProps {
  meetingId: string;
  meetingTitle?: string;
  onClose?: () => void;
}

export function LiveKitRoom({ meetingId, meetingTitle = "Innovexa Live Session", onClose }: LiveKitRoomProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userName, setUserName] = useState("Operations Lead");
  const hasAutoStartedRef = useRef<boolean>(false);

  useEffect(() => {
    const storedRole = sessionStorage.getItem("userRole");
    if (storedRole === "organizer") {
      setUserName("Lead Organizer");
    }
  }, []);

  // 1. Stable LiveKit Room Connection Hook
  const {
    room,
    token,
    roomName,
    isConnected,
    isConnecting,
    isConfigured,
    errorMsg: roomError,
    participantCount,
    leaveRoom,
  } = useLiveKitRoom({
    meetingId,
    participantName: userName,
  });

  // 2. Media Controls State Manager Hook (Owns camera, mic, screen share, audio analyzer, and session recording)
  const {
    isMicEnabled,
    isCameraEnabled,
    isScreenSharing,
    screenMediaStream,
    recordingDuration,
    isRecording,
    isUploadingRecording,
    micLevel,
    connectionQuality,
    localMediaStream,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    startRecording,
    stopRecording,
    appendRecordedChunk,
  } = useMediaControls({
    room,
    meetingId,
  });

  // 3. Whisper Real-time Transcription Pipeline Hook (Consumes localMediaStream)
  const {
    segments,
    isTranscribing,
    chunksSent,
    chunksTranscribed,
    lastError: whisperError,
    startPipeline,
    stopPipeline,
  } = useWhisperPipeline({
    meetingId,
    mediaStream: localMediaStream,
    speakerHint: userName,
    onAudioChunkRecorded: appendRecordedChunk,
  });

  // Auto start recording & Whisper transcription when joining the meeting
  useEffect(() => {
    if (localMediaStream && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startRecording();
      startPipeline();
    }
  }, [localMediaStream, startRecording, startPipeline]);

  const handleLeaveAndClose = useCallback(async () => {
    stopRecording();
    stopPipeline();
    await leaveRoom();
    onClose?.();
  }, [stopRecording, stopPipeline, leaveRoom, onClose]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      stopPipeline();
    } else {
      startRecording();
      startPipeline();
    }
  }, [isRecording, startRecording, stopRecording, startPipeline, stopPipeline]);

  return (
    <div
      className={`space-y-4 font-sans text-[var(--text)] transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[var(--bg)] p-4 overflow-y-auto"
          : "w-full"
      }`}
    >
      {/* Room Header Banner */}
      <div className="ops-panel p-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--border)] bg-[var(--panel)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
            <Video size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-[var(--text)] uppercase tracking-wide">
                {meetingTitle}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30">
                {isConnected ? "WEBRTC CONNECTED" : isConnecting ? "CONNECTING..." : "STANDBY"}
              </span>

              {isRecording && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--red)]/15 text-[var(--red)] border border-[var(--red)]/30 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" /> AUTO-RECORDING
                </span>
              )}

              {isUploadingRecording && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--amber)]/15 text-[var(--amber)] border border-[var(--amber)]/30 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> SAVING...
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-[var(--text-dim)] mt-0.5">
              Room: <span className="text-[var(--primary)] font-bold">{roomName || `innovexa-meeting-${meetingId}`}</span> • LiveKit SFU WebRTC Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)]">
            <Users size={12} className="text-[var(--primary)]" />
            <span>{Math.max(1, participantCount)} Participant{participantCount > 1 ? "s" : ""}</span>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Main Room Grid: Video Feeds & Live Diarized Caption Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Video Room Stage */}
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[300px]">
            {/* Local Participant Camera Tile - Always keeps natural camera mirroring */}
            <ParticipantTile
              name={userName}
              isLocal={true}
              isMicMuted={!isMicEnabled}
              isCameraOff={!isCameraEnabled}
              isScreenShare={false}
              mediaStream={localMediaStream}
              audioLevel={micLevel}
              connectionQuality={connectionQuality}
              mirror={true}
            />

            {/* Screen Share Tile (When active) or AI Notetaker Tile */}
            {isScreenSharing && screenMediaStream ? (
              <ParticipantTile
                name={`${userName}'s Screen`}
                isLocal={true}
                isMicMuted={!isMicEnabled}
                isCameraOff={false}
                isScreenShare={true}
                mediaStream={screenMediaStream}
                audioLevel={0}
                connectionQuality={connectionQuality}
                mirror={false}
              />
            ) : (
              /* Remote Simulated / LiveKit Participant Tile */
              <ParticipantTile
                name="AI Notetaker & Governance Bot"
                isLocal={false}
                isMicMuted={!isRecording}
                isCameraOff={true}
                isSpeaking={isTranscribing}
                connectionQuality="excellent"
                mirror={false}
              />
            )}
          </div>

          {/* Tactical In-Meeting Media Control HUD */}
          <MediaControlHUD
            isMicEnabled={isMicEnabled}
            isCameraEnabled={isCameraEnabled}
            isScreenSharing={isScreenSharing}
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            micLevel={micLevel}
            chunksSent={chunksSent}
            chunksTranscribed={chunksTranscribed}
            connectionQuality={connectionQuality}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onToggleScreenShare={toggleScreenShare}
            onToggleRecording={handleToggleRecording}
            onLeaveRoom={handleLeaveAndClose}
          />
        </div>

        {/* Right Col: Real-Time Live Whisper Diarized Caption Feed */}
        <div className="ops-panel p-4 space-y-3 border border-[var(--border)] bg-[var(--panel)] shadow-sm flex flex-col h-full min-h-[380px]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="font-mono text-xs font-bold uppercase text-[var(--primary)] flex items-center gap-1.5">
              <FileText size={13} className="text-[var(--teal)]" />
              <span>LIVE WHISPER CAPTIONS</span>
            </div>

            {isTranscribing && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--teal)]/15 text-[var(--teal)] font-mono text-[10px] font-bold uppercase animate-pulse border border-[var(--teal)]/30">
                <Radio size={10} /> INGESTING
              </span>
            )}
          </div>

          {/* Transcript Feed Scrollable Area */}
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs max-h-[350px] pr-1">
            {segments.length > 0 ? (
              segments.map((seg, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] space-y-1 animate-fadeIn"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[var(--primary)]">{seg.speaker}</span>
                    <span className="text-[var(--text-dim)]">[{seg.timestamp}]</span>
                  </div>
                  <p className="text-[var(--text)] font-sans text-xs leading-relaxed">{seg.text}</p>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[var(--text-dim)] font-mono text-xs border border-dashed border-[var(--border)] rounded-lg">
                <Sparkles size={18} className="text-[var(--primary)] animate-pulse" />
                <p>No captions captured yet.</p>
                <p className="text-[10px] text-[var(--text-faint)]">
                  Click <strong className="text-[var(--teal)]">"START REC & STT"</strong> on the HUD below to begin streaming audio to Whisper.
                </p>
              </div>
            )}
          </div>

          {/* Whisper Footer Telemetry */}
          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-mono text-[var(--text-dim)]">
            <span className="flex items-center gap-1">
              <Shield size={11} className="text-[var(--teal)]" /> 256-Bit TLS E2EE
            </span>
            <span>{segments.length} Segments Processed</span>
          </div>
        </div>
      </div>

      {/* Error Banners if any */}
      {(roomError || whisperError) && (
        <div className="rounded-lg bg-[var(--red)]/12 border border-[var(--red)]/40 p-3 text-[var(--red)] text-xs flex items-center gap-2 font-mono">
          <AlertCircle size={14} className="shrink-0" />
          <span>{roomError || whisperError}</span>
        </div>
      )}
    </div>
  );
}
