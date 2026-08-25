"use client";

import { useEffect, useState, useRef } from "react";
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
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [citations, setCitations] = useState<any[]>([]);
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("organizer");

  // Option 1: Live Tab Audio Capture State
  const [isTabRecording, setIsTabRecording] = useState(false);
  const [tabRecordSeconds, setTabRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const role = sessionStorage.getItem("userRole") || "organizer";
    setUserRole(role);

    fetchStatus();
    fetchActionItems();
    fetchCitations();

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
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

  const fetchActionItems = async () => {
    try {
      const res = await fetch(`/api/recordings/meeting/${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setActionItems(data.actionItems || []);
      }
    } catch {
      // Ignore
    }
  };

  const fetchCitations = async () => {
    try {
      const res = await fetch(`/api/citations?meetingId=${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setCitations(data);
      }
    } catch (err) {
      console.warn("[AIAgentPanel] Mapped citations not found yet:", err);
    }
  };

  // Option 2: Managed Cloud Bot Join Trigger
  const handleManagedBotJoin = async () => {
    if (userRole !== "organizer") {
      setErrorMsg("Forbidden: Must be logged in as an Organizer.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // Priority 1: MeetingBaas API Dispatch
      let res = await fetch("/api/meeting-baas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ meetingId }),
      });

      if (!res.ok) {
        // Priority 2: Standard Cloud Bot Endpoint
        res = await fetch("/api/ai-agent/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userRole,
          },
          body: JSON.stringify({ meetingId, useManagedBot: true }),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to trigger AI Agent");
      }

      const data = await res.json();
      setAgent(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error joining meeting";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Option 1: Live Tab Audio Recorder Implementation
  const startTabAudioCapture = async () => {
    setErrorMsg(null);
    try {
      audioChunksRef.current = [];
      
      // Request screen/tab media with audio stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          } as any,
        });
      } catch (err) {
        // Fallback to direct microphone audio if tab picker is cancelled
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        
        setIsTabRecording(false);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        
        await uploadAndProcessTabAudio(audioBlob);
      };

      recorder.start(1000);
      setIsTabRecording(true);
      setTabRecordSeconds(0);
      setAgent((prev) => ({ ...prev, status: "recording" }));

      recordTimerRef.current = setInterval(() => {
        setTabRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Tab audio capture error:", err);
      setErrorMsg("Could not capture tab audio. Please grant screen/audio permissions.");
    }
  };

  const stopTabAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAndProcessTabAudio = async (audioBlob: Blob) => {
    setAgent((prev) => ({ ...prev, status: "transcribing" }));
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `meeting_tab_${Date.now()}.webm`);
      formData.append("meetingId", meetingId);

      const res = await fetch("/api/recordings/upload", {
        method: "POST",
        headers: { "x-user-role": userRole },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload tab audio recording.");
      }

      setAgent((prev) => ({ ...prev, status: "summarizing" }));
      await new Promise((res) => setTimeout(res, 1500));

      await fetchStatus();
      await fetchActionItems();
      await fetchCitations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process captured tab audio.");
      setAgent((prev) => ({ ...prev, status: "idle" }));
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = () => {
    switch (agent.status) {
      case "joining":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#4A3A1E] text-[#E8A33D] border border-[#E8A33D]/50 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> DISPATCHING CLOUD BOT
          </span>
        );
      case "recording":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#3A2224] text-[#E2666A] border border-[#E2666A]/50">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E2666A] animate-ping" /> RECORDING TAB AUDIO
          </span>
        );
      case "transcribing":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#1B3634] text-[#49B9AE] border border-[#49B9AE]/50 animate-pulse">
            <Mic className="w-3.5 h-3.5" /> WHISPER ASR TRANSCRIBING
          </span>
        );
      case "summarizing":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#4A3A1E] text-[#E8A33D] border border-[#E8A33D]/50 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> GPT-4 SUMMARIZING
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#1B3634] text-[#49B9AE] border border-[#49B9AE]/50">
            <CheckCircle2 className="w-3.5 h-3.5" /> AI INSIGHTS EXTRACTED
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
    <div className="rounded-xl border border-[#212B2E] bg-[#182124] p-5 shadow-xl space-y-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A363A] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#252a36] text-[#E8A33D] border border-[#212B2E]">
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

      {/* Recording Audio/Video Playback Player */}
      {agent.recordingUrl && agent.recordingUrl.length > 0 && (
        <div className="space-y-2 p-3.5 rounded-lg bg-[#141C1F] border border-[#49B9AE]/40">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#49B9AE] font-semibold">
            <span className="flex items-center gap-1.5">
              <Mic className="w-4 h-4" /> MEETING AUDIO RECORDING PLAYBACK
            </span>
            <a
              href={agent.recordingUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="text-[10px] text-[#E8A33D] hover:underline flex items-center gap-1 font-mono border border-[#E8A33D]/40 rounded px-2 py-0.5"
            >
              DOWNLOAD RECORDING
            </a>
          </div>

          <audio
            controls
            src={agent.recordingUrl}
            className="w-full mt-2 rounded border border-[#212B2E] bg-[#182124]"
          >
            Your browser does not support audio playback.
          </audio>
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
              <div 
                key={i} 
                className="flex items-start gap-2 border-b border-[#2A363A] pb-1.5 last:border-0 last:pb-0 p-1 rounded"
              >
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
          <div className="rounded-lg bg-[#1D272B] border border-[#E8A33D]/40 p-3.5 text-[#E7EEEF] whitespace-pre-wrap font-sans leading-relaxed text-xs">
            {agent.summary}
          </div>
        </div>
      )}

      {/* Extracted Action Items Box */}
      {actionItems && actionItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#49B9AE] flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> AI EXTRACTED ACTION ITEMS
          </div>
          <div className="rounded-lg bg-[#141C1F] border border-[#2A363A] p-3.5 space-y-2 text-[#E7EEEF] font-mono text-xs">
            {actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 border-b border-[#212B2E] pb-2 last:border-0 last:pb-0">
                <span className="font-bold text-[#E8A33D] min-w-[130px]">{item.assignee}:</span>
                <span className="flex-1">{item.task}</span>
                {item.dueDate && (
                  <span className="text-[10px] text-[#8FA0A4]">
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
