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
      const role = sessionStorage.getItem("userRole") || "organizer";
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
        headers: { "x-user-role": role },
      });
      if (res.ok) {
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        alert("Failed to cancel meeting. Organizer permission required.");
      }
    } catch (err) {
      console.error("Cancel meeting error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartEarly = async (meetingId: string) => {
    setActionLoadingId(meetingId);
    try {
      const userRole = sessionStorage.getItem("userRole") || "organizer";
      const res = await fetch("/api/ai-agent/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ meetingId }),
      });

      if (res.ok) {
        fetchUpcomingMeetings();
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Failed to start meeting early. Organizer permission required.");
      }
    } catch (error) {
      console.error("Start early error:", error);
      alert("Network error while starting meeting. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[var(--text-dim)] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
        <span>Loading scheduled meetings...</span>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center font-mono text-xs space-y-3">
        <Calendar className="w-8 h-8 text-[var(--text-faint)] mx-auto" />
        <div className="text-[var(--text-dim)] font-bold">NO UPCOMING MEETINGS SCHEDULED</div>
        <p className="text-[var(--text-faint)] max-w-md mx-auto font-sans">
          Schedule a meeting using the button above to reserve an AI Notetaker slot.
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

        const isGoogleMeet = !!meet.googleMeetLink;
        const meetLink = meet.googleMeetLink || `/meeting/innovexa-meeting-${meet.id}?meetingId=${meet.id}`;
        const duration = meet.durationMinutes || meet.durationMins || 30;

        return (
          <div
            key={meet.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-[var(--primary)]/40 transition-all"
          >
            <div className="space-y-2">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-[var(--teal)]/12 text-[var(--teal)] border border-[var(--teal)]/30 flex items-center gap-1">
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

              {/* Google Meet Link or Native Room Indicator */}
              <div className="p-2 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-[11px] flex items-center justify-between">
                <span className="text-[var(--teal)] font-bold truncate">
                  {isGoogleMeet ? meetLink : "Innovexa Native Video Room"}
                </span>
                {isGoogleMeet && (
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--text-dim)] hover:text-[var(--teal)] ml-2 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
              {isGoogleMeet ? (
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>JOIN GOOGLE MEET</span>
                </a>
              ) : (
                <Link
                  href={meetLink}
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>JOIN LIVE ROOM</span>
                </Link>
              )}

              <div className="flex items-center gap-2">
                <Link
                  href={`/meetings/${meet.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--primary)] hover:border-[var(--primary)] font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>ROOM</span>
                </Link>

                <button
                  onClick={() => handleCancelMeeting(meet.id)}
                  disabled={actionLoadingId === meet.id}
                  className="p-1.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--red)] hover:border-[var(--red)] transition-all"
                  title="Cancel Scheduled Meeting"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
