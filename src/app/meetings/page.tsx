"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  Loader2,
  Trash2,
  Video,
  Bot,
  Plus,
} from "lucide-react";

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Clean Form State
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:30");
  const [meetingLink, setMeetingLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState("organizer");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(sessionStorage.getItem("userRole") || "organizer");
    }
    fetchMeetings();
  }, []);

  async function fetchMeetings() {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      setMeetings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteMeeting = async (id: string) => {
    if (userRole !== "organizer") {
      alert("Forbidden: Only organizers can delete meetings.");
      return;
    }

    const confirmDelete = window.confirm(
      "Remove this meeting and all associated AI insights?"
    );

    if (confirmDelete) {
      try {
        const res = await fetch(`/api/meetings/${id}`, {
          method: "DELETE",
          headers: { "x-user-role": userRole },
        });
        if (res.ok) {
          setMeetings((prev) => prev.filter((m) => m.id !== id));
        } else {
          const err = await res.json();
          alert(err.error || "Failed to delete meeting");
        }
      } catch (err: any) {
        alert("Failed to delete meeting: " + err.message);
      }
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          department: "General",
          agenda: meetingLink.trim() || `Meeting scheduled for ${date} at ${time}`,
          transcript: "Meeting initialized. Awaiting live AI bot recording.",
        }),
      });

      const data = await res.json();
      if (data.success && data.meetingId) {
        router.push(`/meetings/${data.meetingId}`);
      } else {
        alert(data.error || "Failed to create meeting.");
      }
    } catch (err: any) {
      alert("Error creating meeting: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[840px] space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#212B2E] pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#E7EEEF] flex items-center gap-2">
            <Bot className="text-[#E8A33D] w-5 h-5" /> Meetings & AI Agent
          </h1>
          <p className="text-xs text-[#8FA0A4] mt-0.5">
            Dispatch autonomous AI bot to Google Meet calls or view extracted insights.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#182124] border border-[#2B383C] text-[#8FA0A4]">
          {meetings.length} Total
        </span>
      </div>

      {/* Clean Quick Dispatch Form */}
      <div className="ops-panel p-5 space-y-4 border border-[#2B383C]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#E8A33D] uppercase flex items-center gap-1.5">
            <Plus size={14} /> Schedule & Join AI Bot
          </span>
          <span className="text-[11px] font-mono text-[#5B6A6E]">Instant Setup</span>
        </div>

        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase text-[#8FA0A4] mb-1 block font-bold">
                MEETING TITLE *
              </label>
              <input
                required
                placeholder="e.g. Weekly Operations Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ops-input w-full p-2.5 text-xs text-[#E7EEEF]"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#E8A33D] mb-1 block font-bold flex items-center gap-1">
                <Video size={12} /> GOOGLE MEET LINK
              </label>
              <input
                placeholder="https://meet.google.com/abc-defg-hij"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="ops-input w-full p-2.5 text-xs font-mono text-[#E8A33D] border-[#E8A33D]/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase text-[#8FA0A4] mb-1 block">
                DATE
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ops-input w-full p-2.5 text-xs"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#8FA0A4] mb-1 block">
                TIME
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="ops-input w-full p-2.5 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded bg-[#E8A33D] px-5 py-2.5 text-xs font-bold text-[#1A1305] hover:bg-[#d8932d] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>{isSubmitting ? "Creating..." : "DISPATCH AI BOT & OPEN MEETING"}</span>
          </button>
        </form>
      </div>

      {/* Clean Scheduled Meetings List */}
      <div className="space-y-3 pt-2">
        <h2 className="font-display text-sm font-bold text-[#E7EEEF] tracking-wide uppercase font-mono">
          Scheduled Meetings ({meetings.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-[#8FA0A4]">
            <Loader2 size={16} className="animate-spin inline mr-2" /> Loading meetings...
          </div>
        ) : meetings.length === 0 ? (
          <div className="ops-panel p-8 text-center text-xs font-mono text-[#8FA0A4] border border-dashed border-[#2B383C]">
            No meetings scheduled yet. Create one above to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => {
              const hasMeetLink = m.agenda && m.agenda.includes("meet.google.com");
              const meetUrl = hasMeetLink ? m.agenda : null;

              return (
                <div
                  key={m.id}
                  className="ops-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#2B383C] hover:border-[#49B9AE]/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/meetings/${m.id}`}
                        className="font-body text-sm font-bold text-[#E7EEEF] hover:text-[#49B9AE] transition-colors"
                      >
                        {m.title}
                      </Link>
                      <span className="ops-badge border-[#49B9AE]/40 bg-[#142624] text-[#49B9AE] text-[10px] font-mono">
                        AI BOT READY
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-[11px] text-[#8FA0A4]">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(m.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} className="text-[#E8A33D]" />
                        {m.decisions?.length || 0} decisions
                      </span>
                      <span>{m.tasks?.length || 0} tasks</span>
                    </div>

                    {meetUrl && (
                      <div className="font-mono text-[11px] text-[#E8A33D] truncate max-w-[400px]">
                        Link: {meetUrl}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/meetings/${m.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#182124] border border-[#2B383C] text-xs font-mono font-semibold text-[#E7EEEF] hover:border-[#49B9AE] hover:text-[#49B9AE] transition-colors"
                    >
                      <span>Open</span>
                      <ChevronRight size={14} />
                    </Link>

                    {userRole === "organizer" && (
                      <button
                        onClick={() => handleDeleteMeeting(m.id)}
                        className="p-1.5 rounded text-[#8FA0A4] hover:text-[#E2666A] hover:bg-[#2A181A] transition-colors"
                        title="Delete Meeting"
                        aria-label={`Delete meeting ${m.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
