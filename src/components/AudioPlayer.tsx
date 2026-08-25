"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Download, Mic, AlertCircle } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function AudioPlayer({ src, title = "MEETING AUDIO RECORDING PLAYBACK" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playbackSrc, setPlaybackSrc] = useState(src);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setPlaybackSrc(src);
    setAudioError(null);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.warn("[AudioPlayer] Main playback error, attempting fallback...", e);
      // Fallback check from .wav to .mp3 or direct URL
      if (playbackSrc.endsWith(".wav")) {
        setPlaybackSrc(playbackSrc.replace(".wav", ".mp3"));
      } else {
        setAudioError("Unable to play audio. Download recording to listen offline.");
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [playbackSrc]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setAudioError(null);
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("[AudioPlayer] Playback trigger failed:", err);
          setIsPlaying(false);
          setAudioError("Click to interact or download file.");
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(val)) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  return (
    <div className="space-y-2 p-3.5 rounded-lg bg-[#141C1F] border border-[#49B9AE]/40 shadow-lg">
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#49B9AE] font-semibold">
        <span className="flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-[#49B9AE]" /> {title}
        </span>
        <a
          href={playbackSrc}
          target="_blank"
          rel="noreferrer"
          download
          className="text-[10px] text-[#E8A33D] hover:text-[#f3b759] flex items-center gap-1 font-mono border border-[#E8A33D]/40 rounded px-2 py-0.5 hover:border-[#E8A33D] transition-all"
        >
          <Download className="w-3 h-3" /> DOWNLOAD
        </a>
      </div>

      <div className="flex items-center gap-3 bg-[#182124] p-2.5 rounded border border-[#212B2E]">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded bg-[#E8A33D] text-[#141C1F] hover:bg-[#f3b759] flex items-center justify-center transition-all flex-shrink-0 font-bold shadow-md shadow-[#E8A33D]/20"
          aria-label={isPlaying ? "Pause recording" : "Play recording"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 rounded-lg bg-[#2B383C] appearance-none cursor-pointer accent-[#49B9AE]"
        />

        <div className="font-mono text-xs text-[#9a99a0] flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {audioError && (
        <div className="text-[11px] font-mono text-[#E2666A] flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5" /> {audioError}
        </div>
      )}

      <audio ref={audioRef} src={playbackSrc} preload="metadata" />
    </div>
  );
}
