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
      <div className="p-8 text-center text-xs font-mono text-[#5B6A6E] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#49B9AE]" />
        <span>Loading upcoming scheduled meetings...</span>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#2B383C] bg-[#141C1F] p-8 text-center space-y-2 font-mono text-xs text-[#9a99a0]">
        <Calendar className="w-6 h-6 text-[#E8A33D] mx-auto opacity-75" />
        <div className="font-bold text-[#e8e1d5]">NO UPCOMING SCHEDULED MEETINGS</div>
        <p className="text-[11px] text-[#5B6A6E]">
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
            className="rounded-xl border border-[#212B2E] bg-[#182124] p-5 shadow-2xl space-y-4 flex flex-col justify-between hover:border-[#49B9AE]/50 transition-all"
          >
            <div className="space-y-2">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-[#49B9AE]/20 text-[#49B9AE] border border-[#49B9AE]/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {meet.status}
                </span>
                <span className="text-[10px] text-[#9a99a0]">{meet.department || "General"}</span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-sm text-[#e8e1d5] line-clamp-1">{meet.title}</h3>

              {/* Date, Time & Duration */}
              <div className="flex items-center gap-4 text-xs text-[#9a99a0] pt-1">
                <div className="flex items-center gap-1.5 text-[#E8A33D] font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formattedDate} @ {formattedTime}</span>
                </div>
                <span>({duration} mins)</span>
              </div>

              {/* Google Meet Link */}
              <div className="p-2 rounded bg-[#141C1F] border border-[#212B2E] text-[11px] flex items-center justify-between">
                <span className="text-[#49B9AE] font-bold truncate">{meetLink}</span>
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#9a99a0] hover:text-[#49B9AE] ml-2 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-[#212B2E] flex items-center justify-between gap-2">
              <a
                href={meetLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 px-3 rounded bg-[#49B9AE] text-[#0D1A18] font-bold uppercase text-[11px] hover:bg-[#3ca298] transition-all flex items-center justify-center gap-1 shadow-md shadow-[#49B9AE]/20"
              >
                <Video className="w-3.5 h-3.5" /> JOIN GOOGLE MEET
              </a>

              <button
                onClick={() => handleTriggerBotNow(meet.id)}
                disabled={actionLoadingId === meet.id}
                className="py-1.5 px-3 rounded bg-[#E8A33D] text-[#1a1f2d] font-bold uppercase text-[11px] hover:bg-[#c98a2d] transition-all flex items-center justify-center gap-1 shadow-md shadow-[#E8A33D]/20"
              >
                {actionLoadingId === meet.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                <span>LAUNCH BOT</span>
              </button>

              <button
                onClick={() => handleCancelMeeting(meet.id)}
                disabled={actionLoadingId === meet.id}
                className="p-1.5 rounded bg-[#141C1F] border border-[#E2666A]/40 text-[#E2666A] hover:bg-[#E2666A]/20 transition-all"
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
