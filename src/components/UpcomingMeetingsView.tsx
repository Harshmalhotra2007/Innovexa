"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Users,
  Bot,
  CheckCircle2,
  AlertCircle,
  Play,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  date: string;
  scheduledDate?: string;
  durationMinutes?: number;
  durationMins?: number;
  googleMeetLink?: string;
  department?: string;
  status: string;
  participants?: string;
}

interface UpcomingMeetingsViewProps {
  onRefreshNeeded?: () => void;
}

export function UpcomingMeetingsView({ onRefreshNeeded }: UpcomingMeetingsViewProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUpcomingMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meetings/upcoming");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.warn("Error fetching upcoming meetings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingMeetings();
  }, []);

  const handleCancelMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled meeting?")) return;
    setActionLoadingId(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
        headers: { "x-user-role": "organizer" },
      });
      if (res.ok) {
        fetchUpcomingMeetings();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      console.error("Error cancelling meeting:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTriggerBotNow = async (meetingId: string) => {
    setActionLoadingId(meetingId);
    try {
      const res = await fetch("/api/ai-agent/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      if (res.ok) {
        fetchUpcomingMeetings();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      console.error("Error launching bot:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[var(--text-faint)] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--teal)]" />
        <span>Loading upcoming scheduled meetings...</span>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center space-y-2 font-mono text-xs text-[var(--text-dim)]">
        <Calendar className="w-6 h-6 text-[var(--primary)] mx-auto opacity-75" />
        <div className="font-bold text-[var(--text)]">NO UPCOMING SCHEDULED MEETINGS</div>
        <p className="text-[11px] text-[var(--text-faint)]">
          Click "Schedule Meeting" to create a new slot with Google Meet integration.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
      {meetings.map((meet) => {
        const meetDate = new Date(meet.scheduledDate || meet.date);
        const formattedDate = meetDate.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const formattedTime = meetDate.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });

        const meetLink = meet.googleMeetLink || `https://meet.google.com/test-${meet.id.substring(0, 8)}`;
        const duration = meet.durationMinutes || meet.durationMins || 30;

        return (
          <div
            key={meet.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl space-y-4 flex flex-col justify-between hover:border-[var(--primary)]/50 transition-all"
          >
            <div className="space-y-2">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {meet.status}
                </span>
                <span className="text-[10px] text-[var(--text-dim)]">{meet.department || "General"}</span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-sm text-[var(--text)] line-clamp-1">{meet.title}</h3>

              {/* Date, Time & Duration */}
              <div className="flex items-center gap-4 text-xs text-[var(--text-dim)] pt-1">
                <div className="flex items-center gap-1.5 text-[var(--primary)] font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formattedDate} @ {formattedTime}</span>
                </div>
                <span>({duration} mins)</span>
              </div>

              {/* Google Meet Link */}
              <div className="p-2 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-[11px] flex items-center justify-between">
                <span className="text-[var(--teal)] font-bold truncate">{meetLink}</span>
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--text-dim)] hover:text-[var(--teal)] ml-2 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
              <a
                href={meetLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 px-3 rounded bg-[var(--teal)] text-white font-bold uppercase text-[11px] hover:bg-[var(--teal)]/80 transition-all flex items-center justify-center gap-1 shadow-md shadow-[var(--teal)]/20"
              >
                <Video className="w-3.5 h-3.5" /> JOIN GOOGLE MEET
              </a>

              <button
                onClick={() => handleTriggerBotNow(meet.id)}
                disabled={actionLoadingId === meet.id}
                className="py-1.5 px-3 rounded bg-[var(--primary)] text-white font-bold uppercase text-[11px] hover:bg-[var(--primary-hover)] transition-all flex items-center justify-center gap-1 shadow-md shadow-[var(--primary)]/20"
              >
                {actionLoadingId === meet.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                <span>LAUNCH BOT</span>
              </button>

              <button
                onClick={() => handleCancelMeeting(meet.id)}
                disabled={actionLoadingId === meet.id}
                className="p-1.5 rounded bg-[var(--panel-alt)] border border-[var(--red)]/40 text-[var(--red)] hover:bg-[var(--red)]/20 transition-all"
                title="Cancel Meeting"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
