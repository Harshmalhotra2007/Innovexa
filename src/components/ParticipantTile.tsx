"use client";

import React, { useRef, useEffect } from "react";
import { Mic, MicOff, User, Radio } from "lucide-react";

export interface ParticipantTileProps {
  name: string;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isMicMuted?: boolean;
  isCameraOff?: boolean;
  isScreenShare?: boolean;
  mediaStream?: MediaStream | null;
  connectionQuality?: "excellent" | "good" | "poor";
  audioLevel?: number; // 0 to 100
}

export function ParticipantTile({
  name,
  isLocal = false,
  isSpeaking = false,
  isMicMuted = false,
  isCameraOff = false,
  isScreenShare = false,
  mediaStream,
  connectionQuality = "excellent",
  audioLevel = 0,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, isCameraOff]);

  // Derive initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const qualityColor =
    connectionQuality === "excellent"
      ? "bg-[var(--teal)]"
      : connectionQuality === "good"
      ? "bg-[var(--amber)]"
      : "bg-[var(--red)]";

  const isSpeakingNow = isSpeaking || audioLevel > 15;

  return (
    <div
      className={`relative w-full h-full min-h-[220px] rounded-xl overflow-hidden bg-[var(--panel-alt)] border transition-all flex items-center justify-center ${
        isSpeakingNow
          ? "border-[var(--teal)] shadow-md shadow-[var(--teal)]/20 ring-1 ring-[var(--teal)]"
          : "border-[var(--border)]"
      }`}
    >
      {/* Video Element */}
      {!isCameraOff && mediaStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Avoid local audio feedback loop
          className={`w-full h-full object-cover ${isLocal && !isScreenShare ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        /* Camera Off Avatar Fallback */
        <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
          <div className="w-16 h-16 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center font-display text-xl font-bold text-[var(--primary)] shadow-sm">
            {initials || <User size={24} />}
          </div>
          <span className="font-mono text-xs text-[var(--text-dim)]">Camera Off</span>
        </div>
      )}

      {/* Top HUD: Connection Quality & Speaking Indicator */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 bg-[var(--panel)]/85 backdrop-blur-md px-2 py-0.5 rounded border border-[var(--border)] text-[10px] font-mono">
          <div className={`w-1.5 h-1.5 rounded-full ${qualityColor} animate-pulse`} />
          <span className="text-[var(--text)] uppercase font-semibold">
            {connectionQuality}
          </span>
        </div>

        {isSpeakingNow && (
          <div className="flex items-center gap-1 bg-[var(--teal)]/15 border border-[var(--teal)]/40 text-[var(--teal)] px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase animate-pulse">
            <Radio size={10} />
            <span>Speaking</span>
          </div>
        )}
      </div>

      {/* Bottom HUD: Name & Mic Status */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between bg-[var(--panel)]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--border)] z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-bold text-[var(--text)] truncate">
            {name} {isLocal ? "(You)" : ""}
          </span>
          {isScreenShare && (
            <span className="px-1.5 py-0.2 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-mono uppercase font-bold border border-[var(--primary)]/30">
              Screen
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isMicMuted ? (
            <div className="p-1 rounded bg-[var(--red)]/15 text-[var(--red)] border border-[var(--red)]/30">
              <MicOff size={12} />
            </div>
          ) : (
            <div className="p-1 rounded bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30">
              <Mic size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
