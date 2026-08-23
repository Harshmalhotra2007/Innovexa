"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Users,
  FileText,
  Sparkles,
  Gavel,
  ListChecks,
  Bell,
  CircleCheck,
  Circle,
  Loader2,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [meeting, setMeeting] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [userRole, setUserRole] = useState<string>("organizer");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(sessionStorage.getItem("userRole") || "organizer");
    }
    if (id) {
      fetchMeetingDetail();
      fetchUsers();
    }
  }, [id]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMeetingDetail() {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      setMeeting(data);
      setTranscript(data.transcript || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const isReadOnly = userRole === "participant";

  const runExtraction = async () => {
    if (isReadOnly || !transcript.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meeting.title,
          department: meeting.department,
          agenda: meeting.agenda,
          objectives: meeting.objectives,
          transcript,
        }),
      });
      const data = await res.json();
      if (data.success && data.meetingId) {
        fetchMeetingDetail();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeleteMeeting = async () => {
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
          router.push("/meetings");
        } else {
          const err = await res.json();
          alert(err.error || "Failed to delete meeting");
        }
      } catch (err: any) {
        alert("Failed to delete meeting: " + err.message);
      }
    }
  };

  const handleAssignTask = async (taskId: string, assigneeId: string) => {
    if (userRole !== "organizer") {
      alert("Forbidden: Only organizers can assign tasks.");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ assigneeId }),
      });
      if (res.ok) {
        fetchMeetingDetail();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch (err: any) {
      alert("Failed to assign task: " + err.message);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (isReadOnly) return;
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      fetchMeetingDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const sendReminder = (assignee: string) => {
    setToast(`Reminder sent to ${assignee}`);
    setTimeout(() => setToast(null), 3000);
  };

  const remindAllPending = () => {
    if (!meeting || !meeting.tasks) return;
    const pendingNames = Array.from(
      new Set(meeting.tasks.filter((t: any) => t.status !== "Completed").map((t: any) => t.ownerName))
    );
    if (pendingNames.length === 0) return;
    setToast(`Reminder sent to ${pendingNames.join(", ")}`);
    setTimeout(() => setToast(null), 3500);
  };

  const daysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const deadlineTone = (days: number | null) => {
    if (days === null) return "#5B6A6E";
    if (days < 0) return "#E2666A";
    if (days <= 2) return "#E8A33D";
    return "#49B9AE";
  };

  const deadlineLabel = (days: number | null) => {
    if (days === null) return "no deadline";
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "due today";
    return `${days}d left`;
  };

  const exportSummary = () => {
    if (!meeting) return;
    
    let md = `# Meeting Summary: ${meeting.title}\n`;
    md += `**Date:** ${new Date(meeting.date).toLocaleDateString()}\n`;
    md += `**Department:** ${meeting.department}\n\n`;
    
    if (meeting.decisions && meeting.decisions.length > 0) {
      md += `## Decisions\n`;
      meeting.decisions.forEach((d: any) => {
        md += `- **${d.title}**: ${d.context}\n`;
      });
      md += `\n`;
    }
    
    if (meeting.tasks && meeting.tasks.length > 0) {
      md += `## Action Items\n`;
      meeting.tasks.forEach((t: any) => {
        md += `- [${t.status === 'Completed' ? 'x' : ' '}] **${t.title}** (Assignee: ${t.ownerName}, Due: ${new Date(t.deadline).toLocaleDateString()})\n`;
      });
      md += `\n`;
    }
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/\\s+/g, '_')}_Summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-[#8FA0A4]">
        <Loader2 size={20} className="animate-spin text-[#E8A33D] mx-auto mb-2" />
        Loading meeting details...
      </div>
    );
  }

  if (!meeting || meeting.error) {
    return (
      <div className="py-20 text-center space-y-3 text-xs text-[#8FA0A4]">
        <AlertTriangle size={20} className="text-[#E2666A] mx-auto" />
        <p>Meeting record not found.</p>
        <Link href="/meetings" className="text-[#E8A33D] underline">
          Return to meetings
        </Link>
      </div>
    );
  }

  const pendingCount = meeting.tasks?.filter((t: any) => t.status !== "Completed").length || 0;
  const hasResults = (meeting.decisions?.length || 0) > 0 || (meeting.tasks?.length || 0) > 0;

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-2">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-[#1D272B] border border-[#E8A33D] px-4.5 py-2.5 text-xs text-[#E7EEEF] shadow-2xl">
          <Bell size={14} className="text-[#E8A33D]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-[#8FA0A4] hover:text-[#E7EEEF]"
      >
        <ChevronLeft size={14} /> Back to dashboard
      </Link>

      {/* Title Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">{meeting.title}</h1>
          <div className="flex items-center gap-4 mt-1 font-mono text-xs text-[#5B6A6E]">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(meeting.date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {meeting.department || "Operations"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole === "organizer" && (
            <button
              onClick={handleDeleteMeeting}
              className="cyberpunk-btn delete-btn px-3 py-1.5"
              aria-label="Delete meeting"
            >
              DELETE MEETING
            </button>
          )}
          <button
            onClick={exportSummary}
            className="flex items-center gap-1.5 rounded-md border border-[#2A363A] bg-[#182124] px-3 py-1.5 text-xs font-mono text-[#49B9AE] hover:bg-[#1D272B] transition-colors"
          >
            <FileText size={13} />
            <span>EXPORT MD</span>
          </button>
          {isReadOnly && (
            <span className="ops-badge border-[#49B9AE] text-[#49B9AE] flex items-center gap-1">
              <Lock size={10} /> Read-Only Mode
            </span>
          )}
          <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">{meeting.department}</span>
        </div>
      </div>

      {/* Transcript Box */}
      <div className="ops-panel p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E7EEEF]">
          <FileText size={14} className="text-[#E8A33D]" />
          <span>Meeting transcript</span>
        </div>

        <textarea
          rows={8}
          readOnly={isReadOnly}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste raw speech transcript..."
          className="ops-input w-full p-3 text-xs font-mono leading-relaxed"
        />

        {!isReadOnly && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={runExtraction}
              disabled={isExtracting || !transcript.trim()}
              className="flex items-center gap-2 rounded bg-[#E8A33D] px-4 py-2 text-xs font-semibold text-[#1A1305] hover:bg-[#d8932d] disabled:opacity-50"
            >
              {isExtracting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>{isExtracting ? "Analyzing..." : "Generate insights"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Extracted Decisions & Action Items */}
      {hasResults && (
        <div className="space-y-4">
          {/* Decisions */}
          {meeting.decisions && meeting.decisions.length > 0 && (
            <div className="ops-panel p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E7EEEF]">
                <Gavel size={14} className="text-[#49B9AE]" />
                <span>Decisions ({meeting.decisions.length})</span>
              </div>
              <div className="divide-y divide-[#212B2E]">
                {meeting.decisions.map((d: any) => (
                  <div key={d.id} className="py-2.5 space-y-0.5">
                    <div className="text-xs font-medium text-[#E7EEEF]">{d.title}</div>
                    {d.context && <div className="text-[11px] text-[#5B6A6E]">{d.context}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {meeting.tasks && meeting.tasks.length > 0 && (
            <div className="ops-panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E7EEEF]">
                  <ListChecks size={14} className="text-[#E8A33D]" />
                  <span>Action items ({meeting.tasks.length})</span>
                </div>
                {pendingCount > 0 && (
                  <button
                    onClick={remindAllPending}
                    className="flex items-center gap-1 font-mono text-[11px] text-[#8FA0A4] hover:text-[#E7EEEF] border border-[#2A363A] rounded px-2 py-0.5"
                  >
                    <Bell size={11} /> REMIND ALL PENDING ({pendingCount})
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#212B2E]">
                {meeting.tasks.map((t: any) => {
                  const d = daysUntil(t.deadline);
                  const isDone = t.status === "Completed";
                  return (
                    <div key={t.id} className="flex items-start gap-3 py-2.5">
                      <button
                        onClick={() => toggleTaskStatus(t.id, t.status)}
                        disabled={isReadOnly}
                        className={`mt-0.5 ${isReadOnly ? "cursor-not-allowed opacity-60" : "text-[#5B6A6E] hover:text-[#49B9AE]"}`}
                      >
                        {isDone ? (
                          <CircleCheck size={16} className="text-[#49B9AE]" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs ${
                            isDone ? "line-through text-[#5B6A6E]" : "text-[#E7EEEF]"
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
                          {userRole === "organizer" ? (
                            <select
                              className="cyberpunk-select"
                              value={t.assigneeId || ""}
                              onChange={(e) => handleAssignTask(t.id, e.target.value)}
                              aria-label={`Assign task to user for ${t.title}`}
                            >
                              <option value="">Unassigned</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">
                              {t.ownerName}
                            </span>
                          )}
                          <span className="ops-badge border-[#2A363A] text-[#E8A33D]">
                            {t.priority || "Medium"}
                          </span>
                          <span style={{ color: deadlineTone(d) }}>{deadlineLabel(d)}</span>
                        </div>
                      </div>
                      {!isDone && (
                        <button
                          onClick={() => sendReminder(t.ownerName)}
                          title="Send reminder"
                          className="rounded border border-[#2A363A] p-1 text-[#8FA0A4] hover:border-[#E8A33D] hover:text-[#E8A33D]"
                        >
                          <Bell size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
