"use client";

import { useEffect, useState, useRef } from "react";
import { Bot, Mic, Sparkles, AlertCircle, Play, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

interface AIAgentData {
  id?: string;
  meetingId: string;
  status: "idle" | "joining" | "recording" | "transcribing" | "summarizing" | "completed";
  joinedAt?: string;
  recordingUrl?: string;
  transcript?: TranscriptSegment[];
  summary?: string;
}

interface AIAgentPanelProps {
  meetingId: string;
  meetingTitle?: string;
}

export default function AIAgentPanel({ meetingId, meetingTitle }: AIAgentPanelProps) {
  const [agent, setAgent] = useState<AIAgentData>({
    meetingId,
    status: "idle",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("participant");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Read session role from sessionStorage
    const role = sessionStorage.getItem("userRole") || "participant";
    setUserRole(role);

    // Initial fetch of agent status
    fetchStatus();

    // Connect to SSE Endpoint for real-time updates
    try {
      const es = new EventSource(`/api/ai-agent/${meetingId}/updates`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.status) {
            setAgent((prev) => ({ ...prev, ...data }));
          }
        } catch {
          // Fallback parsing
        }
      };

      es.onerror = () => {
        es.close();
      };
    } catch {
      // EventSource fallback
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [meetingId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/ai-agent/status/${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
      }
    } catch {
      // Ignore
    }
  };

  const handleJoinMeeting = async () => {
    if (userRole !== "organizer") {
      setErrorMsg("Forbidden: Requester must be logged in as an Organizer.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai-agent/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ meetingId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to trigger AI Agent");
      }

      const data = await res.json();
      setAgent(data);
      // Poll to update UI transitions
      const interval = setInterval(async () => {
        const statusRes = await fetch(`/api/ai-agent/status/${meetingId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setAgent(statusData);
          if (statusData.status === "completed") {
            clearInterval(interval);
          }
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error joining meeting";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (agent.status) {
      case "joining":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#2D2316] text-[#E8A33D] border border-[#E8A33D]/50 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> JOINING MEETING
          </span>
        );
      case "recording":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#2E1C1D] text-[#E2666A] border border-[#E2666A]/50">
            <span className="w-2 h-2 rounded-full bg-[#E2666A] animate-ping" /> RECORDING AUDIO
          </span>
        );
      case "transcribing":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#152928] text-[#49B9AE] border border-[#49B9AE]/50 animate-pulse">
            <Mic className="w-3.5 h-3.5" /> WHISPER ASR TRANSCRIBING
          </span>
        );
      case "summarizing":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#2D2316] text-[#E8A33D] border border-[#E8A33D]/50 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> GPT-4 SUMMARIZING
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#152928] text-[#49B9AE] border border-[#49B9AE]/50">
            <CheckCircle2 className="w-3.5 h-3.5" /> AGENT COMPLETED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#141C1F] text-[#8FA0A4] border border-[#212B2E]">
            <Bot className="w-3.5 h-3.5 text-[#8FA0A4]" /> AGENT IDLE
          </span>
        );
    }
  };

  return (
    <div className="ops-panel p-5 space-y-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#212B2E] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#2D2316] text-[#E8A33D] border border-[#E8A33D]/40">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm tracking-wide text-[#E7EEEF] uppercase flex items-center gap-2">
              INNOVEXA AI MEETING AGENT
            </h3>
            <p className="font-mono text-[11px] text-[#5B6A6E] mt-0.5">
              Automated Virtual Participant • Whisper ASR • GPT-4 Summarizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button
            onClick={handleJoinMeeting}
            disabled={agent.status !== "idle" || loading || userRole !== "organizer"}
            className="px-4 py-2 rounded font-display text-xs font-bold uppercase tracking-wider bg-[#E8A33D] text-[#1A1305] hover:bg-[#d8932d] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-[#E8A33D]/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            JOIN MEETING
          </button>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="rounded-lg bg-[#2E1C1D] border border-[#E2666A]/40 p-3 text-[#E2666A] text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Transcribe Caption Feed */}
      {agent.transcript && agent.transcript.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#49B9AE] flex items-center gap-1.5 font-semibold">
            <Mic className="w-3.5 h-3.5" /> LIVE DIARIZED CAPTION STREAM
          </div>
          <div className="rounded-lg bg-[#141C1F] border border-[#212B2E] p-3 max-h-48 overflow-y-auto space-y-2 font-mono text-xs">
            {agent.transcript.map((seg, i) => (
              <div key={i} className="flex items-start gap-2 border-b border-[#2A363A] pb-1.5 last:border-0 last:pb-0">
                <span className="text-[10px] text-[#5B6A6E] pt-0.5">{seg.timestamp}</span>
                <span className="font-bold text-[#49B9AE] min-w-[130px]">{seg.speaker}:</span>
                <span className="text-[#E7EEEF] flex-1">{seg.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary Box */}
      {agent.summary && (
        <div className="space-y-1.5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#E8A33D] flex items-center gap-1.5 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> AI GENERATED EXECUTIVE SUMMARY
          </div>
          <div className="rounded-lg bg-[#1F292D] border border-[#E8A33D]/40 p-3.5 text-[#E7EEEF] whitespace-pre-wrap font-sans leading-relaxed text-xs">
            {agent.summary}
          </div>
        </div>
      )}

      {/* Privacy & Retention Disclaimer */}
      <div className="rounded-lg bg-[#141C1F] border border-[#212B2E] p-2.5 text-[11px] text-[#5B6A6E] flex items-center gap-2 font-mono">
        <ShieldAlert className="w-4 h-4 text-[#49B9AE] flex-shrink-0" />
        <span>
          ⚠️ Privacy Disclaimer: Meetings are recorded and transcribed for summary purposes. Audio files are encrypted at rest in S3/Supabase and subject to a 30-day retention policy.
        </span>
      </div>
    </div>
  );
}
