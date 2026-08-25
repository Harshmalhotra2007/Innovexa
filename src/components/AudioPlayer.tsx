"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Download, Mic, AlertCircle, Radio } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title?: string;
  seekTime?: number | null;
  isRecording?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function AudioPlayer({ src, title = "MEETING AUDIO RECORDING PLAYBACK", seekTime, isRecording = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playbackSrc, setPlaybackSrc] = useState(src);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setPlaybackSrc(src);
    setAudioError(null);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  // Handle Seek Trigger from Transcript Clicks
  useEffect(() => {
    if (typeof seekTime === "number" && audioRef.current && !isNaN(seekTime)) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [seekTime]);

  // Audio Waveform Animation Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const bars = 40;

    const renderWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / bars - 2;

      for (let i = 0; i < bars; i++) {
        let barHeight = 8;
        if (isPlaying || isRecording) {
          barHeight = Math.sin(Date.now() * 0.005 + i * 0.3) * (height / 2.5) + height / 2.5;
        }

        const progress = duration > 0 ? currentTime / duration : 0;
        const barProgress = i / bars;
        const color = isRecording
          ? "#E2666A"
          : barProgress <= progress
          ? "#49B9AE"
          : "#2B383C";

        ctx.fillStyle = color;
        ctx.fillRect(i * (barWidth + 2), (height - barHeight) / 2, barWidth, barHeight);
      }

      animId = requestAnimationFrame(renderWaveform);
    };

    renderWaveform();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isRecording, currentTime, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
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
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn("Audio play error:", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  return (
    <div className="rounded-xl border border-[#2B383C] bg-[#141C1F] p-4 shadow-xl text-[#e8e1d5] space-y-3 font-mono">
      <audio ref={audioRef} src={playbackSrc} preload="metadata" />

      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-[#212B2E] pb-2 text-xs">
        <div className="flex items-center gap-2 text-[#49B9AE]">
          {isRecording ? <Radio className="w-4 h-4 text-[#E2666A] animate-ping" /> : <Mic className="w-4 h-4" />}
          <span className="font-bold tracking-wider uppercase">{title}</span>
        </div>
        <span className="text-[10px] text-[#9a99a0]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Audio Waveform Canvas Visualizer */}
      <div className="h-10 bg-[#0D1315] rounded border border-[#212B2E] p-1 flex items-center justify-center">
        <canvas ref={canvasRef} width={380} height={36} className="w-full h-full" />
      </div>

      {/* Scrubber Range Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!playbackSrc || !!audioError}
          aria-label={isPlaying ? "Pause audio playback" : "Play audio playback"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#49B9AE] text-[#0D1A18] hover:bg-[#3ca298] transition-all disabled:opacity-40 shadow-md"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          aria-label="Audio playback seek position"
          className="flex-1 accent-[#49B9AE] bg-[#182124] h-2 rounded cursor-pointer"
        />

        <a
          href={playbackSrc}
          download="meeting_recording.wav"
          aria-label="Download audio recording file"
          className="p-2 rounded bg-[#182124] border border-[#2B383C] text-[#9a99a0] hover:text-[#49B9AE] transition-all"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      {audioError && (
        <div className="text-[11px] text-[#E2666A] flex items-center gap-1.5 pt-1">
          <AlertCircle className="w-3.5 h-3.5" /> {audioError}
        </div>
      )}
    </div>
  );
}
