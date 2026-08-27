"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AIAgentPanel from "@/components/AIAgentPanel";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Video,
  Building2,
  Trash2,
  FileText,
} from "lucide-react";

interface MeetingDetail {
  id: string;
  title: string;
  date: string;
  department?: string;
  agenda?: string;
  status: string;
  summary?: string;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("organizer");

  useEffect(() => {
    const role = sessionStorage.getItem("userRole") || "organizer";
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (!id) return;

    async function fetchMeetingDetail() {
      try {
        const res = await fetch(`/api/meetings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setMeeting(data);
        } else {
          console.error("Meeting not found");
        }
      } catch (err) {
        console.error("Error fetching meeting:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMeetingDetail();
  }, [id]);

  const handleDeleteMeeting = async () => {
    if (!confirm("Are you sure you want to delete this meeting and all its associated data?")) {
      return;
    }

    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": userRole,
        },
      });

      if (res.ok) {
        router.push("/meetings");
      } else {
        const errData = await res.json();
        alert(`Failed to delete meeting: ${errData.error || "Permission denied"}`);
      }
    } catch (err) {
      console.error("Error deleting meeting:", err);
    }
  };

  const exportSummary = () => {
    if (!meeting) return;
    const content = `# ${meeting.title}
Date: ${new Date(meeting.date).toLocaleString()}
Department: ${meeting.department || "General"}
Status: ${meeting.status}

## Summary
${meeting.summary || "No summary available yet."}
`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, "_")}_summary.md`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-[var(--text-dim)]">
        Loading meeting details...
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-12 text-center space-y-4 font-mono text-xs">
        <div className="text-[var(--red)] font-bold">MEETING NOT FOUND</div>
        <Link href="/meetings" className="text-[var(--primary)] underline">
          ← Back to Meetings Directory
        </Link>
      </div>
    );
  }

  const meetUrl = meeting.agenda && meeting.agenda.includes("meet.google.com") ? meeting.agenda : null;

  return (
    <div className="mx-auto max-w-[880px] space-y-6 py-4 font-sans text-[var(--text)]">
      {/* Back Link */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--primary)] transition-colors"
      >
        <ArrowLeft size={14} />
        <span>BACK TO MEETINGS DIRECTORY</span>
      </Link>

      {/* Meeting Header Banner */}
      <div className="ops-panel p-5 space-y-3 border border-[var(--border)] bg-[var(--panel)] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-[var(--teal)]/12 text-[var(--teal)] border border-[var(--teal)]/30 font-bold uppercase">
                {meeting.status}
              </span>
              {meeting.department && (
                <span className="flex items-center gap-1 text-[var(--text-dim)]">
                  <Building2 size={11} /> {meeting.department}
                </span>
              )}
            </div>

            <h1 className="font-display text-lg font-bold text-[var(--text)] tracking-wide">
              {meeting.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[var(--text-dim)] pt-1">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(meeting.date).toLocaleDateString()}
              </span>
              {meetUrl && (
                <span className="flex items-center gap-1 text-[var(--teal)] bg-[var(--teal)]/10 px-2 py-0.5 rounded border border-[var(--teal)]/30 font-bold">
                  <Video size={11} /> {meetUrl}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportSummary}
              className="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-mono text-[var(--primary)] hover:border-[var(--primary)] transition-colors font-bold"
            >
              <FileText size={13} />
              <span>EXPORT MD</span>
            </button>

            {userRole === "organizer" && (
              <button
                onClick={handleDeleteMeeting}
                className="p-1.5 rounded border border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 transition-colors"
                title="Delete Meeting"
                aria-label="Delete meeting"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CORE FEATURE: AI Agent Panel (One-Click Bot Join, Live Recording & Insights) */}
      <AIAgentPanel meetingId={id} meetingTitle={meeting?.title} />
    </div>
  );
}
