"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Radio,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Bot,
  ExternalLink,
} from "lucide-react";

export default function NativeMeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawRoomId = params?.roomId as string;
  const initialMeetingId = searchParams.get("meetingId") || "";

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [meetingId, setMeetingId] = useState<string>(initialMeetingId);
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [participantName, setParticipantName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [meetingDuration, setMeetingDuration] = useState<number>(0);

  // Set participant name from sessionStorage or fallback
  useEffect(() => {
    const storedName =
      sessionStorage.getItem("userName") ||
      (sessionStorage.getItem("userRole") === "organizer" ? "Lead Organizer" : "Operations Member");
    setParticipantName(storedName);
  }, []);

  // Fetch token & details for this room
  useEffect(() => {
    if (!rawRoomId) return;

    let isMounted = true;

    async function initializeRoom() {
      setLoading(true);
      setError(null);

      try {
        const storedName =
          sessionStorage.getItem("userName") ||
          (sessionStorage.getItem("userRole") === "organizer" ? "Lead Organizer" : "Operations Member");

        const res = await fetch("/api/meetings/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: rawRoomId,
            meetingId: initialMeetingId || undefined,
            participantName: storedName,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate room access credentials.");
        }

        const data = await res.json();
        if (isMounted) {
          setToken(data.participantToken || data.token);
          setServerUrl(data.serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://demo.livekit.cloud");
          setRoomName(data.roomName || rawRoomId);
          if (data.meetingId) setMeetingId(data.meetingId);
          setIsConfigured(data.isConfigured !== false);

          // If meetingId found, fetch meeting title for UI display
          if (data.meetingId) {
            fetch(`/api/meetings/${data.meetingId}`)
              .then((mRes) => mRes.json())
              .then((mData) => {
                if (mData?.title && isMounted) {
                  setMeetingTitle(mData.title);
                }
              })
              .catch(() => {});
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to initialize Native Meeting Room");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeRoom();

    return () => {
      isMounted = false;
    };
  }, [rawRoomId, initialMeetingId]);

  // Duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveOrEnd = useCallback(() => {
    if (meetingId) {
      router.push(`/meetings/${meetingId}`);
    } else {
      router.push("/meetings");
    }
  }, [meetingId, router]);

  return (
    <div className="h-screen w-full flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden font-sans select-none">
      {/* Top Meeting Header Bar */}
      <header className="h-14 px-4 bg-[var(--panel)] border-b border-[var(--border)] flex items-center justify-between z-30 shrink-0 shadow-sm">
        {/* Left: Meeting Info & Back link */}
        <div className="flex items-center gap-3">
          <Link
            href={meetingId ? `/meetings/${meetingId}` : "/meetings"}
            className="p-2 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors"
            title="Exit to Console"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--teal)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--teal)]"></span>
              </span>
              <h1 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text)] truncate max-w-[200px] sm:max-w-md">
                {meetingTitle || `Native Room: ${roomName || rawRoomId}`}
              </h1>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-dim)]">
              <span className="text-[var(--teal)] font-bold">{formatDuration(meetingDuration)}</span>
              <span>•</span>
              <span className="truncate">{participantName || "Organizer"}</span>
            </div>
          </div>
        </div>

        {/* Center: Realtime AI & Security Badges */}
        <div className="hidden md:flex items-center gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Notetaker & Summary Active</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--teal)]/10 border border-[var(--teal)]/30 text-[var(--teal)] font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Native E2E WebRTC</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-all shadow-sm"
            title="Copy Meeting Invite URL"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--teal)]" />
                <span className="text-[var(--teal)]">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">INVITE</span>
              </>
            )}
          </button>

          {meetingId && (
            <Link
              href={`/meetings/${meetingId}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors shadow-sm"
              title="Open AI Intelligence Panel in new tab"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI OPS</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          )}

          <button
            onClick={handleLeaveOrEnd}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--red)]/15 border border-[var(--red)]/40 text-[var(--red)] hover:bg-[var(--red)] hover:text-white font-mono text-xs font-bold uppercase transition-all shadow-sm"
          >
            LEAVE
          </button>
        </div>
      </header>

      {/* Main Video Room Container */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative bg-slate-950 flex flex-col justify-center items-center">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-center p-6 font-mono">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)]/30 border-t-[var(--primary)] animate-spin" />
              <Radio className="w-5 h-5 text-[var(--primary)] absolute inset-0 m-auto" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                CONNECTING TO NATIVE WEBRTC ROOM...
              </p>
              <p className="text-xs text-slate-400">
                Establishing peer connection and initializing real-time audio pipeline.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-md p-6 rounded-xl bg-slate-900 border border-[var(--red)]/40 text-center space-y-4 font-mono shadow-2xl">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-[var(--red)]/10 text-[var(--red)]">
                <AlertCircle className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                ROOM CONNECTION FAILED
              </h2>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-bold uppercase hover:bg-[var(--primary-hover)] transition-colors"
              >
                RETRY
              </button>
              <Link
                href="/meetings"
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold uppercase hover:text-white transition-colors"
              >
                RETURN TO CONSOLE
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && token && (
          <div className="w-full h-full livekit-theme-container">
            <LiveKitRoom
              serverUrl={serverUrl}
              token={token}
              connect={true}
              audio={true}
              video={true}
              onDisconnected={handleLeaveOrEnd}
              data-lk-theme="default"
              style={{ height: "100%", width: "100%" }}
            >
              <VideoConference />
            </LiveKitRoom>
          </div>
        )}
      </main>
    </div>
  );
}
