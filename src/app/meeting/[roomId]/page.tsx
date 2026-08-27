"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LiveKitRoom } from "@/components/LiveKitRoom";
import {
  Radio,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

function MeetingRoomContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawRoomId = (params?.roomId as string) || "innovexa-meeting-session";
  const initialMeetingId = searchParams?.get("meetingId") || "";

  const [meetingId, setMeetingId] = useState<string>(initialMeetingId);
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveMeeting() {
      try {
        setLoading(true);
        setError(null);

        // Resolve meetingId if not provided in search params
        let resolvedId = initialMeetingId;
        if (!resolvedId && rawRoomId) {
          const match = rawRoomId.match(/^innovexa-meeting-(.+)$/);
          if (match) {
            resolvedId = match[1];
          } else {
            // Fetch token/room metadata to resolve meetingId
            const res = await fetch("/api/meetings/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomName: rawRoomId }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.meetingId) resolvedId = data.meetingId;
            }
          }
        }

        if (resolvedId && isMounted) {
          setMeetingId(resolvedId);
          // Fetch meeting title
          const mRes = await fetch(`/api/meetings/${resolvedId}`);
          if (mRes.ok) {
            const mData = await mRes.json();
            if (mData?.title && isMounted) {
              setMeetingTitle(mData.title);
            }
          }
        }
      } catch (err: any) {
        console.warn("[MeetingRoom] Room resolution note:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    resolveMeeting();

    return () => {
      isMounted = false;
    };
  }, [rawRoomId, initialMeetingId]);

  const handleClose = () => {
    if (meetingId) {
      router.push(`/meetings/${meetingId}`);
    } else {
      router.push("/meetings");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] font-mono space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)]/30 border-t-[var(--primary)] animate-spin" />
          <Radio className="w-5 h-5 text-[var(--primary)] absolute inset-0 m-auto" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold uppercase tracking-wider text-[var(--text)]">
            INITIALIZING NATIVE MEETING ENVIRONMENT...
          </p>
          <p className="text-xs text-[var(--text-dim)]">
            Connecting media channels and AI Whisper speech-to-text pipeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] font-sans flex flex-col p-4 sm:p-6 select-none">
      {/* Top Header Navigation */}
      <div className="max-w-7xl mx-auto w-full mb-4 flex items-center justify-between">
        <Link
          href={meetingId ? `/meetings/${meetingId}` : "/meetings"}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--primary)] transition-colors p-2 rounded-lg bg-[var(--panel)] border border-[var(--border)]"
        >
          <ArrowLeft size={14} />
          <span>RETURN TO OPS CONSOLE</span>
        </Link>
      </div>

      {/* Main LiveKit Video Room & Whisper Ingestion Console */}
      <div className="max-w-7xl mx-auto w-full flex-1">
        <LiveKitRoom
          meetingId={meetingId || rawRoomId}
          meetingTitle={meetingTitle || `Operations War Room (${rawRoomId})`}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}

export default function NativeMeetingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] font-mono">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          <p className="text-xs text-[var(--text-dim)] mt-3 uppercase tracking-wider">
            Loading Meeting Session...
          </p>
        </div>
      }
    >
      <MeetingRoomContent />
    </Suspense>
  );
}
