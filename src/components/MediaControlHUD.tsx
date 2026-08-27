"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Radio,
  Square,
  FileText,
  PhoneOff,
  Activity,
  Zap,
} from "lucide-react";

export interface MediaControlHUDProps {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  recordingDuration: number; // in seconds
  micLevel: number; // 0 to 100
  chunksSent?: number;
  chunksTranscribed?: number;
  connectionQuality?: "excellent" | "good" | "poor";
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onLeaveRoom: () => void;
}

export function MediaControlHUD({
  isMicEnabled,
  isCameraEnabled,
  isScreenSharing,
  isRecording,
  recordingDuration,
  micLevel,
  chunksSent = 0,
  chunksTranscribed = 0,
  connectionQuality = "excellent",
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleRecording,
  onLeaveRoom,
}: MediaControlHUDProps) {
  // Format recording timer: mm:ss
  const mins = Math.floor(recordingDuration / 60);
  const secs = recordingDuration % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="w-full bg-[var(--panel)]/95 backdrop-blur-lg border border-[var(--border)] rounded-xl p-3 shadow-2xl space-y-2">
      {/* Upper Status Ribbon: Audio VU Meter, Telemetry & Ingestion Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2 px-1 text-xs font-mono">
        {/* Left: Audio VU Meter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-dim)] uppercase font-bold flex items-center gap-1">
            <Activity size={12} className="text-[var(--primary)]" />
            <span>MIC VU:</span>
          </span>
          <div className="w-24 h-2 rounded-full bg-[var(--panel-alt)] border border-[var(--border)] overflow-hidden flex">
            <div
              className={`h-full transition-all duration-75 ${
                !isMicEnabled
                  ? "w-0"
                  : micLevel > 60
                  ? "bg-[var(--red)]"
                  : micLevel > 30
                  ? "bg-[var(--amber)]"
                  : "bg-[var(--teal)]"
              }`}
              style={{ width: `${isMicEnabled ? Math.min(100, micLevel) : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-dim)]">{isMicEnabled ? `${micLevel}%` : "Muted"}</span>
        </div>

        {/* Right: Whisper Ingestion Stats & Telemetry */}
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--teal)]/15 border border-[var(--teal)]/30 text-[var(--teal)] text-[10px] font-bold uppercase animate-pulse">
              <FileText size={10} />
              <span>Whisper STT: {chunksTranscribed}/{chunksSent} Chunks</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
            <Zap size={11} className="text-[var(--primary)]" />
            <span className="uppercase">{connectionQuality} Uplink</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Control Button Grid */}
      <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 pt-1">
        {/* Left Section: Core Media Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Microphone */}
          <button
            onClick={onToggleMic}
            className={`px-3 py-2 rounded-lg font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all shadow-xs ${
              isMicEnabled
                ? "bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]"
                : "bg-[var(--red)]/15 border border-[var(--red)]/50 text-[var(--red)] hover:bg-[var(--red)]/25"
            }`}
            title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicEnabled ? <Mic size={14} className="text-[var(--teal)]" /> : <MicOff size={14} />}
            <span>{isMicEnabled ? "MIC ON" : "MIC OFF"}</span>
          </button>

          {/* Toggle Camera */}
          <button
            onClick={onToggleCamera}
            className={`px-3 py-2 rounded-lg font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all shadow-xs ${
              isCameraEnabled
                ? "bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]"
                : "bg-[var(--red)]/15 border border-[var(--red)]/50 text-[var(--red)] hover:bg-[var(--red)]/25"
            }`}
            title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isCameraEnabled ? <Video size={14} className="text-[var(--primary)]" /> : <VideoOff size={14} />}
            <span>{isCameraEnabled ? "CAM ON" : "CAM OFF"}</span>
          </button>

          {/* Toggle Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`px-3 py-2 rounded-lg font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all shadow-xs ${
              isScreenSharing
                ? "bg-[var(--primary)] text-white border border-[var(--primary)] shadow-sm"
                : "bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]"
            }`}
            title="Toggle Screen Share"
          >
            <Monitor size={14} className={isScreenSharing ? "text-white" : "text-[var(--primary)]"} />
            <span>{isScreenSharing ? "SHARING" : "SHARE SCREEN"}</span>
          </button>
        </div>

        {/* Right Section: Recording, Transcription & Leave */}
        <div className="flex items-center gap-2">
          {/* Whisper Real-Time Audio Capture & Transcription Pipeline Toggle */}
          <button
            onClick={onToggleRecording}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all shadow-xs ${
              isRecording
                ? "bg-[var(--red)] text-white hover:bg-[var(--red)]/90 animate-pulse"
                : "bg-[var(--teal)] text-white hover:bg-[var(--teal)]/90"
            }`}
            title={isRecording ? "Stop Recording & Transcription" : "Start Live Whisper Recording"}
          >
            {isRecording ? <Square size={13} className="fill-current" /> : <Radio size={13} />}
            <span>{isRecording ? `REC (${timeStr})` : "START REC & STT"}</span>
          </button>

          {/* Leave / Disconnect Room */}
          <button
            onClick={onLeaveRoom}
            className="px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase bg-[var(--red)]/15 border border-[var(--red)]/40 text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-all flex items-center gap-2 shadow-xs"
            title="Leave Meeting Room"
          >
            <PhoneOff size={14} />
            <span>LEAVE ROOM</span>
          </button>
        </div>
      </div>
    </div>
  );
}
