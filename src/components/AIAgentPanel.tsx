"use client";

import { useState } from "react";
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
  Radio,
  RadioTower,
  Cpu,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Clock,
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

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);

  // Convert mm:ss or timestamp string to seconds
  const parseTimestampToSeconds = (ts: string): number => {
    const parts = ts.replace(/[\[\]]/g, "").split(":");
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  };

  const handleTranscriptClick = (timestamp: string, index: number) => {
    setHighlightedChunkIndex(index);
    const secs = parseTimestampToSeconds(timestamp);
    setSeekTimestamp(secs);
  };

  // Timeline Step Configurations
  const timelineSteps = [
    { key: "joining", label: "DISPATCHED", icon: Cpu, time: agent.joinedAt ? new Date(agent.joinedAt).toLocaleTimeString() : "--:--" },
    { key: "admitted", label: "ADMITTED", icon: CheckCircle2, time: agent.joinedAt ? new Date(agent.joinedAt).toLocaleTimeString() : "--:--" },
    { key: "recording", label: "RECORDING", icon: Radio, time: isTabRecording ? `${tabRecordSeconds}s` : "Active" },
    { key: "transcribing", label: "TRANSCRIBING", icon: Loader2, time: "Processing" },
    { key: "completed", label: "INSIGHTS READY", icon: Sparkles, time: "Complete" },
  ];

  const getCurrentStepIndex = () => {
    switch (agent.status) {
      case "joining": return 0;
      case "recording": return 2;
      case "transcribing":
      case "summarizing": return 3;
      case "completed": return 4;
      default: return -1;
    }
  };

  const currentStepIdx = getCurrentStepIndex();

  return (
    <div className="space-y-6 text-[var(--text)] font-sans">
      {/* CARD 1: Unified Meeting Controls & Status Timeline */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-5">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm tracking-wider text-[var(--text)] uppercase">
                INNOVEXA AI MEETING ENGINE
              </h3>
              <p className="font-mono text-[11px] text-[var(--text-dim)] mt-0.5">
                Meeting ID: <span className="text-[var(--primary)] font-bold">{meetingId}</span>
              </p>
            </div>
          </div>

          {(agent.status === "joining" || agent.status === "recording" || isTabRecording) && (
            <button
              onClick={handleEndMeeting}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-[var(--red)] text-white hover:bg-[var(--red)]/90 transition-all flex items-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
              <span>END MEETING</span>
            </button>
          )}
        </div>

        {/* Vertical Chronological Status Timeline */}
        <div className="p-4 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] space-y-3">
          <div className="font-mono text-xs text-[var(--text-dim)] uppercase font-bold flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            <span>SESSION CHRONOLOGICAL STATUS TIMELINE</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {timelineSteps.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.key}
                  className={`p-2.5 rounded-lg border font-mono text-xs space-y-1 transition-all ${
                    isCurrent
                      ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)] shadow-sm font-bold animate-pulse"
                      : isPast
                      ? "bg-[var(--panel)] border-[var(--teal)]/40 text-[var(--teal)] font-bold"
                      : "bg-[var(--panel)] border-[var(--border)] text-[var(--text-faint)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold">STEP {idx + 1}</span>
                    <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? "animate-spin" : ""}`} />
                  </div>
                  <div className="font-bold tracking-wider text-[11px]">{step.label}</div>
                  <div className="text-[10px] opacity-75">{step.time}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streamlined Primary Action Flow */}
        <div className="space-y-3 p-4 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs text-[var(--primary)] font-bold uppercase flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> PRIMARY BOT ACTION FLOW
            </div>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
            >
              <span>ADVANCED OPTIONS</span>
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Enter Google Meet URL (e.g. https://meet.google.com/qfz-imot-oic)"
              value={customMeetUrl}
              onChange={(e) => setCustomMeetUrl(e.target.value)}
              className="flex-1 w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={handleManagedBotJoin}
              disabled={agent.status !== "idle" && agent.status !== "completed" || loading || userRole !== "organizer"}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              <span>LAUNCH AI MEETING ENGINE</span>
            </button>
          </div>

          {/* Expandable Advanced Options Drawer */}
          {showAdvancedOptions && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
              {/* Option 1 Fallback */}
              <div className="p-3 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-2">
                <div className="font-mono text-[10px] font-bold uppercase text-[var(--teal)] flex items-center gap-1">
                  <Radio size={12} /> TAB AUDIO RECORDING FALLBACK
                </div>
                {isTabRecording ? (
                  <button
                    onClick={stopTabAudioCapture}
                    className="w-full py-2 px-3 rounded font-mono text-xs font-bold bg-[var(--red)] text-white hover:bg-[var(--red)]/80 transition-all flex items-center justify-center gap-2 animate-pulse shadow-xs"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> STOP TAB RECORDING ({tabRecordSeconds}s)
                  </button>
                ) : (
                  <button
                    onClick={startTabAudioCapture}
                    disabled={agent.status !== "idle" && agent.status !== "completed"}
                    className="w-full py-2 px-3 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[var(--teal)] text-white hover:bg-[var(--teal)]/80 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Mic className="w-4 h-4" /> START TAB AUDIO RECORDING
                  </button>
                )}
              </div>

              {/* Quality Profile Selector */}
              <div className="p-3 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-2">
                <div className="font-mono text-[10px] font-bold uppercase text-[var(--text-dim)] flex items-center gap-1">
                  <RadioTower size={12} /> SELECT AUDIO QUALITY PROFILE
                </div>
                <div className="flex items-center gap-1">
                  {(["high", "medium", "low"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setAudioQuality(q)}
                      className={`flex-1 py-1.5 rounded font-mono text-[11px] font-bold uppercase transition-all ${
                        audioQuality === q
                          ? "bg-[var(--primary)] text-white border border-[var(--primary)] font-bold shadow-xs"
                          : "bg-[var(--panel-alt)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
                      }`}
                    >
                      {q === "high" ? "High (128k)" : q === "medium" ? "Med (64k)" : "Low (32k)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Host Admission Required Banner */}
        {(agent.status === "joining" || agent.status === "recording") && (
          <div className="rounded-lg bg-[var(--amber)]/12 border border-[var(--amber)]/40 p-3 text-[var(--amber)] text-xs flex items-center gap-2 font-mono">
            <Bot className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <span>
              <strong>📢 HOST ADMISSION REQUIRED:</strong> Innovexa Notetaker has been dispatched to your Google Meet room! Switch to your Google Meet tab and click <strong>"Admit"</strong> when the host popup appears.
            </span>
          </div>
        )}
      </div>

      {/* CARD 2: Synced Live Transcript & Audio Waveform Player */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-4">
        <div className="font-mono text-xs uppercase tracking-wider text-[var(--primary)] flex items-center gap-2 font-semibold">
          <Mic className="w-4 h-4 text-[var(--teal)]" /> LIVE DIARIZED CAPTION STREAM & AUDIO PLAYER
        </div>

        {/* Audio Waveform Player with Click-to-Seek */}
        {agent.recordingUrl && (
          <AudioPlayer src={agent.recordingUrl} seekTime={seekTimestamp} isRecording={agent.status === "recording" || isTabRecording} />
        )}

        {/* Diarized Transcript Feed */}
        {agent.transcript && agent.transcript.length > 0 ? (
          <div className="rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] p-3 max-h-56 overflow-y-auto space-y-2 font-mono text-xs">
            {agent.transcript.map((seg, i) => (
              <button
                key={i}
                onClick={() => handleTranscriptClick(seg.timestamp, i)}
                aria-label={`Seek audio to timestamp ${seg.timestamp} for speaker ${seg.speaker}`}
                className={`w-full text-left flex items-start gap-2 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0 p-2 rounded transition-all hover:bg-[var(--primary)]/10 ${
                  highlightedChunkIndex === i ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text)] font-bold" : ""
                }`}
              >
                <span className="text-[var(--primary)] font-bold flex-shrink-0">[{seg.timestamp}] {seg.speaker}:</span>
                <span className="text-[var(--text)]">{seg.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-[var(--border)] rounded-lg text-xs font-mono text-[var(--text-faint)]">
            No live transcript segments available. Launch bot or start tab recording to stream captions.
          </div>
        )}
      </div>

      {/* CARD 3: Executive AI Summary & Rationale */}
      {agent.summary && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-3">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--primary)] flex items-center gap-2 font-semibold border-b border-[var(--border)] pb-3">
            <Sparkles className="w-4 h-4 text-[var(--amber)]" /> EXECUTIVE AI SYNTHESIS & RATIONALE
          </div>
          <p className="text-sm text-[var(--text-dim)] leading-relaxed font-sans">{agent.summary}</p>
        </div>
      )}

      {/* CARD 4: Automated Action Items & Task Assignments */}
      {actionItems.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-4">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] flex items-center gap-2 font-semibold border-b border-[var(--border)] pb-3">
            <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" /> AUTOMATED ACTION ITEMS & TASK ASSIGNMENTS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-3 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-[var(--primary)]">
                  <span className="font-bold">{item.ownerName || item.assignee}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--teal)]/12 text-[var(--teal)] border border-[var(--teal)]/30 font-bold">
                    {item.priority || "Medium"}
                  </span>
                </div>
                <div className="text-[var(--text)] font-semibold text-xs">{item.title || item.task}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Error Banner */}
      {errorMsg && (
        <div className="rounded-lg bg-[var(--red)]/12 border border-[var(--red)]/40 p-4 text-[var(--red)] text-xs flex items-center gap-3 font-mono">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
