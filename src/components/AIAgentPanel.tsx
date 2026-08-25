"use client";

import { useAIAgent } from "@/hooks/useAIAgent";
import { AudioPlayer } from "./AudioPlayer";
import {
  Bot,
  Mic,
  Sparkles,
  AlertCircle,
  Play,
  CheckCircle2,
  Loader2,
  Square,
  Pause,
  Radio,
  RadioTower,
  Cpu,
} from "lucide-react";

interface AIAgentPanelProps {
  meetingId: string;
  meetingTitle?: string;
}

export default function AIAgentPanel({ meetingId, meetingTitle }: AIAgentPanelProps) {
  const {
    agent,
    actionItems,
    citations,
    highlightedChunkIndex,
    setHighlightedChunkIndex,
    loading,
    errorMsg,
    userRole,
    customMeetUrl,
    setCustomMeetUrl,
    audioQuality,
    setAudioQuality,
    isTabRecording,
    tabRecordSeconds,
    handleManagedBotJoin,
    handleEndMeeting,
    startTabAudioCapture,
    stopTabAudioCapture,
  } = useAIAgent(meetingId);

  const getStatusBadge = () => {
    switch (agent.status) {
      case "joining":
        return (
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wider bg-[#E8A33D]/20 text-[#E8A33D] border border-[#E8A33D]/40 flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> DISPATCHING CLOUD BOT...
          </span>
        );
      case "recording":
        return (
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wider bg-[#E2666A]/20 text-[#E2666A] border border-[#E2666A]/40 flex items-center gap-1.5 animate-pulse">
            <Radio className="w-3.5 h-3.5 animate-ping text-[#E2666A]" /> CAPTURING & DIARIZING AUDIO...
          </span>
        );
      case "transcribing":
      case "summarizing":
        return (
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wider bg-[#49B9AE]/20 text-[#49B9AE] border border-[#49B9AE]/40 flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> SYNTHESIZING AI EXECUTIVE INSIGHTS...
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wider bg-[#49B9AE]/20 text-[#49B9AE] border border-[#49B9AE]/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#49B9AE]" /> EXECUTIVE INSIGHTS READY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-wider bg-[#2B383C] text-[#9a99a0] border border-[#3A494E]">
            IDLE / READY TO DISPATCH
          </span>
        );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="rounded-xl border border-[#212B2E] bg-[#182124] p-5 shadow-2xl space-y-5 text-[#e8e1d5]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#212B2E] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8A33D]/10 border border-[#E8A33D]/30 text-[#E8A33D]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm tracking-wide text-[#e8e1d5] uppercase flex items-center gap-2">
              INNOVEXA AI MEETING ENGINE
            </h3>
            <p className="font-mono text-[11px] text-[#9a99a0] mt-0.5">
              Live Tab Audio Capture & Managed Cloud Bot Integration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge()}
          {(agent.status === "joining" || agent.status === "recording" || isTabRecording) && (
            <button
              onClick={handleEndMeeting}
              disabled={loading}
              className="px-3.5 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[#E2666A] text-white hover:bg-[#c54e52] transition-all flex items-center gap-1.5 shadow-md shadow-[#E2666A]/20"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
              <span>END MEETING</span>
            </button>
          )}
        </div>
      </div>

      {/* Audio Quality Profile Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#141C1F] border border-[#212B2E]">
        <div className="font-mono text-xs text-[#9a99a0] flex items-center gap-1.5 font-bold uppercase">
          <RadioTower className="w-4 h-4 text-[#49B9AE]" />
          <span>AUDIO QUALITY PROFILE:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["high", "medium", "low"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setAudioQuality(q)}
              className={`px-3 py-1 rounded font-mono text-xs font-bold uppercase transition-all ${
                audioQuality === q
                  ? "bg-[#49B9AE] text-[#0D1A18] border border-[#49B9AE] shadow-sm shadow-[#49B9AE]/30"
                  : "bg-[#182124] text-[#9a99a0] border border-[#2B383C] hover:text-white"
              }`}
            >
              {q === "high" ? "High (128k)" : q === "medium" ? "Medium (64k)" : "Low (32k)"}
            </button>
          ))}
        </div>
      </div>

      {/* Action Mode Trigger Buttons (Option 1 & Option 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#141C1F] border border-[#212B2E]">
        {/* OPTION 1: Fail-Proof Live Tab Audio Capture */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase font-bold text-[#49B9AE] flex items-center gap-1">
            <Radio size={12} /> OPTION 1: LIVE TAB AUDIO RECORDING (100% FAIL-PROOF)
          </div>

          {isTabRecording ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-[#E2666A] animate-pulse">
                {formatTime(tabRecordSeconds)}
              </span>
              <button
                onClick={stopTabAudioCapture}
                className="px-4 py-2 rounded font-mono text-xs font-bold bg-[#E2666A] text-white hover:bg-[#c54e52] transition-all flex items-center gap-1.5 animate-pulse shadow-md"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> STOP & EXTRACT INSIGHTS
              </button>
            </div>
          ) : (
            <button
              onClick={startTabAudioCapture}
              disabled={agent.status !== "idle" && agent.status !== "completed"}
              className="w-full py-2.5 px-3 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[#49B9AE] text-[#0D1A18] hover:bg-[#3ca298] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#49B9AE]/20"
            >
              <Mic className="w-4 h-4" /> START LIVE TAB RECORDING
            </button>
          )}
        </div>

        {/* OPTION 2: Managed Cloud Bot Integration */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase font-bold text-[#E8A33D] flex items-center gap-1">
            <Cpu size={12} /> OPTION 2: MANAGED CLOUD BOT DISPATCH
          </div>
          <input
            type="text"
            placeholder="Google Meet URL (e.g. https://meet.google.com/qfz-imot-oic)"
            value={customMeetUrl}
            onChange={(e) => setCustomMeetUrl(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-[#182124] border border-[#2B383C] text-xs font-mono text-[#E7EEEF] placeholder-[#5B6A6E] focus:outline-none focus:border-[#E8A33D]"
          />
          <button
            onClick={handleManagedBotJoin}
            disabled={agent.status !== "idle" && agent.status !== "completed" || loading || userRole !== "organizer"}
            className="w-full py-2.5 px-3 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[#E8A33D] text-[#1a1f2d] hover:bg-[#c98a2d] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#E8A33D]/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            DISPATCH CLOUD BOT
          </button>
        </div>
      </div>

      {/* Host Admission Required Banner */}
      {(agent.status === "joining" || agent.status === "recording") && (
        <div className="rounded-lg bg-[#E8A33D]/10 border border-[#E8A33D]/40 p-3 text-[#E8A33D] text-xs flex items-center gap-2 font-mono">
          <Bot className="w-4 h-4 flex-shrink-0 animate-bounce" />
          <span>
            <strong>📢 HOST ADMISSION REQUIRED:</strong> Innovexa Notetaker has been dispatched to your Google Meet room! Please switch to your Google Meet browser tab and click <strong>"Admit"</strong> when the host entry popup appears.
          </span>
        </div>
      )}

      {/* Recording Audio/Video Playback Player */}
      {agent.recordingUrl && agent.recordingUrl.length > 0 && (
        <AudioPlayer src={agent.recordingUrl} />
      )}

      {/* Live Transcribe Caption Feed */}
      {agent.transcript && agent.transcript.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#49B9AE] flex items-center gap-1.5 font-semibold">
            <Mic className="w-3.5 h-3.5" /> LIVE DIARIZED CAPTION STREAM
          </div>
          <div className="rounded-lg bg-[#141C1F] border border-[#212B2E] p-3 max-h-48 overflow-y-auto space-y-2 font-mono text-xs">
            {agent.transcript.map((seg, i) => (
              <div 
                key={i} 
                className={`flex items-start gap-2 border-b border-[#2A363A] pb-1.5 last:border-0 last:pb-0 p-1 rounded transition-colors ${
                  highlightedChunkIndex === i ? "bg-[#49B9AE]/20 border-[#49B9AE] text-white" : ""
                }`}
              >
                <span className="text-[#E8A33D] font-bold flex-shrink-0">[{seg.timestamp}] {seg.speaker}:</span>
                <span className="text-[#e8e1d5]">{seg.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {agent.summary && (
        <div className="rounded-lg bg-[#141C1F] border border-[#212B2E] p-4 space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#E8A33D] flex items-center gap-1.5 font-semibold">
            <Sparkles className="w-4 h-4" /> EXECUTIVE AI SYNTHESIS & RATIONALE
          </div>
          <p className="text-sm text-[#c5c0b8] leading-relaxed font-sans">{agent.summary}</p>
        </div>
      )}

      {/* Extracted Action Items */}
      {actionItems.length > 0 && (
        <div className="rounded-lg bg-[#141C1F] border border-[#212B2E] p-4 space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#49B9AE] flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> AUTOMATED ACTION ITEMS & TASK ASSIGNMENTS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actionItems.map((item, idx) => (
              <div key={idx} className="rounded border border-[#2B383C] bg-[#182124] p-2.5 space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-[#E8A33D]">
                  <span className="font-bold">{item.ownerName || item.assignee}</span>
                  <span className="text-[10px] text-[#9a99a0]">{item.priority || "Medium"}</span>
                </div>
                <div className="text-[#e8e1d5] text-[11px]">{item.title || item.task}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="rounded-lg bg-[#E2666A]/10 border border-[#E2666A]/30 p-3 text-[#E2666A] text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
