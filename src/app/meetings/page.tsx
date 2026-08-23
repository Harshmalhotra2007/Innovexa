"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Clock,
  Users,
  Sparkles,
  ChevronRight,
  FileText,
  Loader2,
  AlertTriangle,
  Plus,
} from "lucide-react";

const SAMPLE_TRANSCRIPT = `Priya: Okay, let's start. First topic — the Q3 vendor contract renewal.
Rahul: I looked at the numbers, the new vendor quote is 12% lower. I think we should switch.
Priya: Agreed, let's go with the new vendor. Rahul, can you finalize the contract by next Friday?
Rahul: Yes, I'll have it signed by then.
Priya: Great, that's decided. Next — the dashboard bug reported by the sales team.
Ananya: I've already found the root cause, it's a caching issue. I can push a fix.
Priya: Ananya, please deploy the fix by Wednesday and loop in QA before release.
Ananya: Sounds good, will do.
Priya: Also, just a note — marketing mentioned they might need a new landing page next quarter, nothing to action yet.
Priya: Last item, the offsite budget. We discussed a few options but haven't decided anything, need more inputs from finance before locking this.
Priya: Okay, let's wrap up here. Thanks everyone.`;

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Meeting Form
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:30");
  const [department, setDepartment] = useState("Operations");
  const [transcript, setTranscript] = useState("");
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
      "▲ WARNING: SYSTEM PURGE REQUESTED ▲\n\nThis will permanently delete the meeting and all associated tasks/decisions. Proceed?"
    );

    if (confirmDelete) {
      try {
        const res = await fetch(`/api/meetings/${id}`, {
          method: "DELETE",
          headers: {
            "x-user-role": userRole,
          },
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
          title,
          department,
          agenda: `Meeting scheduled for ${date} at ${time}`,
          transcript: transcript || SAMPLE_TRANSCRIPT,
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
    <div className="mx-auto max-w-[860px] space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">Schedule a meeting</h1>
        <p className="text-xs text-[#8FA0A4] mt-1">
          Capture the basics now — transcript and AI extraction happen after the meeting.
        </p>
      </div>

      {/* Schedule Meeting Form */}
      <div className="ops-panel p-6 space-y-4">
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E] mb-1.5">
              MEETING TITLE
            </div>
            <input
              required
              placeholder="e.g. Weekly Ops Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="ops-input w-full p-2.5 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E] mb-1.5">
                DATE
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ops-input w-full p-2.5 text-xs"
              />
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E] mb-1.5">
                TIME
              </div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="ops-input w-full p-2.5 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E] mb-1.5">
                DEPARTMENT
              </div>
              <input
                placeholder="e.g. Operations"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="ops-input w-full p-2.5 text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E]">
                TRANSCRIPT (OPTIONAL NOW)
              </div>
              <button
                type="button"
                onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
                className="text-[11px] text-[#5B6A6E] underline hover:text-[#8FA0A4]"
              >
                use sample transcript
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Paste raw speech transcript..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="ops-input w-full p-2.5 text-xs font-mono leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 rounded bg-[#E8A33D] px-4 py-2 text-xs font-semibold text-[#1A1305] hover:bg-[#d8932d] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>{isSubmitting ? "Processing..." : "Create meeting & generate insights"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Scheduled Meetings List */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#E7EEEF]">All scheduled meetings</h2>
        <div className="ops-panel overflow-hidden divide-y divide-[#212B2E]">
          {meetings.map((m) => (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              className="flex items-center justify-between p-4 hover:bg-[#1D272B] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm font-semibold text-[#E7EEEF]">{m.title}</span>
                  <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">{m.department}</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[11px] text-[#5B6A6E]">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(m.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} className="text-[#E8A33D]" />
                    {m.decisions?.length || 0} decisions
                  </span>
                  <span>{m.tasks?.length || 0} tasks</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {userRole === "organizer" && (
                  <button
                    className="cyberpunk-btn delete-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteMeeting(m.id);
                    }}
                    aria-label={`Delete meeting ${m.title}`}
                  >
                    DELETE MEETING
                  </button>
                )}
                <ChevronRight size={16} className="text-[#5B6A6E]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

