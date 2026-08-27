"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Mic, Radio, AlertCircle } from "lucide-react";

interface AudioPlayerProps {
  src?: string | null;
  title?: string;
  seekTime?: number | null;
  isRecording?: boolean;
}

export function AudioPlayer({
  src,
  title = "AUDIO PLAYBACK & LIVE WAVEFORM",
  seekTime,
  isRecording = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSrc, setPlaybackSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Sync incoming props
  useEffect(() => {
    if (src) {
      setPlaybackSrc(src);
      setAudioError(null);
    } else {
      setPlaybackSrc(null);
    }
  }, [src]);

  // Handle external seek requests
  useEffect(() => {
    if (seekTime !== undefined && seekTime !== null && audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [seekTime]);

  // Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.warn("Audio playback error occurred");
      setAudioError("Audio stream unavailable or buffer unreadable");
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [playbackSrc]);

  // Waveform Canvas Visualizer Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const drawWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 32;
      const barWidth = 4;
      const gap = 3;

      for (let i = 0; i < bars; i++) {
        let height = 6;
        if (isPlaying || isRecording) {
          height = Math.sin((i + Date.now() / 150) * 0.4) * 12 + 14;
        } else {
          height = Math.sin(i * 0.5) * 4 + 8;
        }

        const x = i * (barWidth + gap) + 12;
        const y = (canvas.height - height) / 2;

        const progressRatio = duration > 0 ? currentTime / duration : 0;
        const barRatio = i / bars;

        if (barRatio <= progressRatio || isRecording) {
          ctx.fillStyle = "#49B9AE";
        } else {
          ctx.fillStyle = "#2B383C";
        }

        ctx.fillRect(x, y, barWidth, height);
      }

      animId = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isRecording, currentTime, duration]);

  const togglePlay = () => {
    if (!audioRef.current || !playbackSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        setAudioError("Failed to initiate audio playback.");
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-alt)] p-4 shadow-xl text-[var(--text)] space-y-3 font-mono">
      <audio ref={audioRef} src={playbackSrc || undefined} preload="metadata" />

      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--teal)]">
          {isRecording ? <Radio className="w-4 h-4 text-[var(--red)] animate-ping" /> : <Mic className="w-4 h-4" />}
          <span className="font-bold tracking-wider uppercase">{title}</span>
        </div>
        <span className="text-[10px] text-[var(--text-dim)]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Audio Waveform Canvas Visualizer */}
      <div className="h-10 bg-[var(--bg)] rounded border border-[var(--border)] p-1 flex items-center justify-center">
        <canvas ref={canvasRef} width={380} height={36} className="w-full h-full" />
      </div>

      {/* Scrubber Range Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!playbackSrc || !!audioError}
          aria-label={isPlaying ? "Pause audio playback" : "Play audio playback"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--teal)] text-[#0D1A18] hover:bg-[var(--teal)]/80 transition-all disabled:opacity-40 shadow-md"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={!playbackSrc}
          className="flex-1 h-1.5 bg-[var(--bg)] rounded-lg appearance-none cursor-pointer accent-[var(--teal)]"
        />

        <button
          onClick={toggleMute}
          disabled={!playbackSrc}
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          className="p-2 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-[var(--red)]" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Audio Warning Alert */}
      {audioError && (
        <div className="p-2 rounded bg-[var(--red)]/10 border border-[var(--red)]/40 text-[var(--red)] text-[10px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{audioError}</span>
        </div>
      )}
    </div>
  );
}
