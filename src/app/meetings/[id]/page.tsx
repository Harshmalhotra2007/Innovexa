"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
  Trash2,
  Video,
} from "lucide-react";
import AIAgentPanel from "@/components/AIAgentPanel";

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("organizer");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(sessionStorage.getItem("userRole") || "organizer");
    }
    fetchMeetingDetails();
  }, [id]);

  async function fetchMeetingDetails() {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      setMeeting(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteMeeting = async () => {
    if (userRole !== "organizer") return;
    if (!window.confirm("Delete meeting and all associated AI insights?")) return;

    // Signal bot to leave Google Meet call immediately
    if (meeting && meeting.agenda && meeting.agenda.includes("meet.google.com")) {
      try {
        await fetch("/api/ai-agent/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId: id }),
        });
      } catch (e) {
        console.warn("Bot leave signal failed:", e);
      }
    }

    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
        headers: { "x-user-role": userRole },
      });
      if (res.ok) {
        router.push("/meetings");
      } else {
        alert("Failed to delete meeting.");
      }
    } catch (err: any) {
      alert("Error deleting meeting: " + err.message);
    }
  };

  const exportSummary = () => {
    if (!meeting) return;
    let md = `# Meeting Summary: ${meeting.title}\n`;
    md += `**Date:** ${new Date(meeting.date).toLocaleDateString()}\n\n`;

    if (meeting.decisions?.length > 0) {
      md += `## Decisions\n`;
      meeting.decisions.forEach((d: any) => {
        md += `- **${d.title}**: ${d.context || ""}\n`;
      });
      md += `\n`;
    }

    if (meeting.tasks?.length > 0) {
      md += `## Action Items\n`;
      meeting.tasks.forEach((t: any) => {
        md += `- [${t.status === "Completed" ? "x" : " "}] **${t.title}**\n`;
      });
      md += `\n`;
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/\s+/g, "_")}_Summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-mono text-[#8FA0A4]">
        <Loader2 size={18} className="animate-spin text-[#E8A33D] mx-auto mb-2" />
        Loading meeting workspace...
      </div>
    );
  }

  if (!meeting || meeting.error) {
    return (
      <div className="py-20 text-center space-y-3 text-xs font-mono text-[#8FA0A4]">
        <AlertTriangle size={18} className="text-[#E2666A] mx-auto" />
        <p>Meeting record not found.</p>
        <Link href="/meetings" className="text-[#E8A33D] underline">
          Return to meetings
        </Link>
      </div>
    );
  }

  const meetUrl = meeting.agenda && meeting.agenda.includes("meet.google.com") ? meeting.agenda : null;

  return (
    <div className="mx-auto max-w-[840px] space-y-5 py-4">
      {/* Navigation & Header */}
      <div className="space-y-2 border-b border-[#212B2E] pb-4">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-xs font-mono text-[#8FA0A4] hover:text-[#E7EEEF] transition-colors"
        >
          <ChevronLeft size={14} /> Back to meetings
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">{meeting.title}</h1>
            <div className="flex items-center gap-3 mt-1 font-mono text-xs text-[#8FA0A4] flex-wrap">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(meeting.date).toLocaleDateString()}
              </span>
              {meetUrl && (
                <span className="flex items-center gap-1 text-[#E8A33D] bg-[#231B10] px-2 py-0.5 rounded border border-[#E8A33D]/30">
                  <Video size={11} /> {meetUrl}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportSummary}
              className="flex items-center gap-1.5 rounded border border-[#2B383C] bg-[#182124] px-3 py-1.5 text-xs font-mono text-[#49B9AE] hover:border-[#49B9AE] transition-colors"
            >
              <FileText size={13} />
              <span>EXPORT MD</span>
            </button>

            {userRole === "organizer" && (
              <button
                onClick={handleDeleteMeeting}
                className="p-1.5 rounded border border-[#3A2224] bg-[#221517] text-[#E2666A] hover:bg-[#3A2224] transition-colors"
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
