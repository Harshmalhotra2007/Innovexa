"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AIAgentPanel from "@/components/AIAgentPanel";
import {
  Clock,
  ArrowLeft,
  Video,
  Building2,
  Trash2,
  FileText,
  Zap,
  Loader2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Users,
  MessageSquare,
  ListChecks,
  Sparkles,
  Send,
  RefreshCw,
  Radio,
  Activity,
  User,
} from "lucide-react";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
interface Task {
  id: string;
  title?: string;
  task?: string;
  ownerName?: string;
  assignee?: string;
  priority?: string;
  status: string;
  deadline?: string | null;
  department?: string;
}

interface Decision {
  id: string;
  title: string;
  description?: string;
  department?: string;
  createdAt: string;
}

interface Segment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  order: number;
  type?: string;
}

interface MeetingDetail {
  id: string;
  title: string;
  date: string;
  department?: string;
  agenda?: string;
  objectives?: string;
  status: string;
  summary?: string;
  participants?: string;
  durationMins?: number;
  tasks?: Task[];
  decisions?: Decision[];
  segments?: Segment[];
  actionItems?: Array<{ id: string; assignee: string; task: string; dueDate?: string | null }>;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
const KANBAN_COLS: { key: string; label: string; colorClass: string; bgClass: string }[] = [
  { key: "Pending",     label: "Pending",     colorClass: "text-[var(--amber)]", bgClass: "bg-[var(--amber)]/10 border-[var(--amber)]/30" },
  { key: "In Progress", label: "In Progress",  colorClass: "text-[var(--primary)]", bgClass: "bg-[var(--primary)]/10 border-[var(--primary)]/30" },
  { key: "Completed",   label: "Completed",   colorClass: "text-[var(--teal)]",  bgClass: "bg-[var(--teal)]/10 border-[var(--teal)]/30" },
  { key: "Overdue",     label: "Overdue",     colorClass: "text-[var(--red)]",   bgClass: "bg-[var(--red)]/10 border-[var(--red)]/30" },
  { key: "Escalated",   label: "Escalated",   colorClass: "text-orange-500",     bgClass: "bg-orange-500/10 border-orange-500/30" },
];

function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  return diff;
}

function priorityBadge(priority?: string) {
  const map: Record<string, string> = {
    High:   "bg-[var(--red)]/12 text-[var(--red)] border-[var(--red)]/30",
    Medium: "bg-[var(--amber)]/12 text-[var(--amber)] border-[var(--amber)]/30",
    Low:    "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30",
  };
  return map[priority ?? ""] ?? "bg-[var(--border)] text-[var(--text-dim)] border-[var(--border)]";
}

// ──────────────────────────────────────────────────────────
// Sub-component: Kanban Task Card
// ──────────────────────────────────────────────────────────
function TaskCard({
  task,
  onStatusToggle,
  onReassign,
}: {
  task: Task;
  onStatusToggle: (id: string, current: string) => void;
  onReassign: (id: string, name: string) => void;
}) {
  const [reassignVal, setReassignVal] = useState("");
  const name = task.title || task.task || "Untitled";
  const owner = task.ownerName || task.assignee || "Unassigned";
  const d = daysUntil(task.deadline);
  const isDone = task.status === "Completed";

  return (
    <div className={`p-3 rounded-lg border bg-[var(--panel)] space-y-2.5 shadow-sm transition-all hover:shadow-md ${isDone ? "opacity-60" : ""}`}>
      {/* Check + Title */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => onStatusToggle(task.id, task.status)}
          className="mt-0.5 shrink-0 text-[var(--text-faint)] hover:text-[var(--teal)] transition-colors"
          title={isDone ? "Mark pending" : "Mark done"}
        >
          {isDone
            ? <CheckCircle2 size={16} className="text-[var(--teal)]" />
            : <Circle size={16} />}
        </button>
        <p className={`text-xs font-semibold leading-relaxed ${isDone ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"}`}>
          {name}
        </p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        <span className="flex items-center gap-0.5 text-[var(--text-dim)]">
          <User size={9} /> {owner}
        </span>

        {task.priority && (
          <span className={`px-1.5 py-0.5 rounded border font-bold uppercase ${priorityBadge(task.priority)}`}>
            {task.priority}
          </span>
        )}

        {task.deadline && (
          <span className={`flex items-center gap-0.5 font-bold ${
            isDone ? "text-[var(--text-faint)]"
            : d !== null && d < 0 ? "text-[var(--red)]"
            : d !== null && d <= 2 ? "text-[var(--amber)]"
            : "text-[var(--teal)]"
          }`}>
            <Clock size={9} />
            {isDone ? "Done" : d !== null && d < 0 ? `Overdue ${Math.abs(d)}d` : d === 0 ? "Due today" : `${d}d`}
          </span>
        )}
      </div>

      {/* Inline Reassign */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="Re-assign…"
          value={reassignVal}
          onChange={e => setReassignVal(e.target.value)}
          className="ops-input flex-1 px-2 py-0.5 text-[10px] font-mono text-[var(--text)] placeholder-[var(--text-faint)]"
        />
        <button
          onClick={() => { if (reassignVal.trim()) { onReassign(task.id, reassignVal.trim()); setReassignVal(""); } }}
          disabled={!reassignVal.trim()}
          className="p-1 rounded border border-[var(--border)] bg-[var(--panel-alt)] text-[var(--primary)] hover:border-[var(--primary)] disabled:opacity-30 transition-colors"
          title="Reassign"
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────
export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>("organizer");
  const [activeTab, setActiveTab] = useState<"board" | "transcript" | "decisions" | "ai">("board");
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const role = sessionStorage.getItem("userRole") || "organizer";
    setUserRole(role);
  }, []);

  const fetchMeeting = useCallback(async (quiet = false) => {
    if (!id) return;
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMeeting(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchMeeting(); }, [fetchMeeting]);

  // ── Task status toggle ──
  const handleStatusToggle = async (taskId: string, current: string) => {
    const next = current === "Completed" ? "Pending" : "Completed";
    setMeeting(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks?.map(t => t.id === taskId ? { ...t, status: next } : t),
      };
    });
    await fetch(`/api/tasks/${taskId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => fetchMeeting(true));
    showToast(`Task marked ${next}.`);
  };

  // ── Reassign ──
  const handleReassign = async (taskId: string, name: string) => {
    await fetch(`/api/tasks/${taskId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee: name }),
    });
    setMeeting(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks?.map(t => t.id === taskId ? { ...t, ownerName: name, assignee: name } : t),
      };
    });
    showToast(`Reassigned to ${name}.`);
  };

  // ── Extract action items ──
  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await fetch(`/api/meetings/${id}/extract-action-items`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Extracted ${data.tasks?.length || 0} action item(s) from transcript.`);
        fetchMeeting(true);
      } else {
        showToast(data.error || data.message || "No items found.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      showToast(msg, "error");
    } finally {
      setExtracting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
        headers: { "x-user-role": userRole },
      });
      if (res.ok) {
        router.push("/meetings");
      } else {
        const errData = await res.json();
        showToast(errData.error || "Permission denied", "error");
        setShowDeleteConfirm(false);
      }
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Export ──
  const exportSummary = () => {
    if (!meeting) return;
    const content = `# ${meeting.title}\nDate: ${new Date(meeting.date).toLocaleString()}\nDepartment: ${meeting.department || "General"}\nStatus: ${meeting.status}\n\n## Agenda\n${meeting.agenda || "N/A"}\n\n## Objectives\n${meeting.objectives || "N/A"}\n\n## Summary\n${meeting.summary || "No summary available yet."}\n\n## Decisions\n${meeting.decisions?.map(d => `- ${d.title}`).join("\n") || "None"}\n\n## Tasks\n${meeting.tasks?.map(t => `- [${t.status === "Completed" ? "x" : " "}] ${t.title || t.task} (${t.ownerName || t.assignee || "Unassigned"})`).join("\n") || "None"}\n`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, "_")}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────────────────────────────────
  // Loading / not found
  // ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-[var(--text-dim)]">
        <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
        <p className="font-mono text-xs uppercase tracking-wider">Loading meeting intelligence…</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-12 text-center space-y-4 font-mono text-xs">
        <div className="text-[var(--red)] font-bold text-sm">MEETING NOT FOUND</div>
        <Link href="/meetings" className="text-[var(--primary)] underline">← Back to Meetings Directory</Link>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // Derived stats
  // ──────────────────────────────────────────────────────────
  const tasks = meeting.tasks ?? [];
  const decisions = meeting.decisions ?? [];
  const segments = meeting.segments ?? [];
  const meetUrl = meeting.agenda?.includes("meet.google.com") ? meeting.agenda : null;

  const completedCount = tasks.filter(t => t.status === "Completed").length;
  const completionPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const overdueCount = tasks.filter(t => { const d = daysUntil(t.deadline); return t.status !== "Completed" && d !== null && d < 0; }).length;

  const tasksByStatus: Record<string, Task[]> = {};
  for (const col of KANBAN_COLS) tasksByStatus[col.key] = [];
  for (const t of tasks) {
    const key = Object.keys(tasksByStatus).find(k => t.status?.toLowerCase() === k.toLowerCase()) ?? "Pending";
    tasksByStatus[key].push(t);
  }

  const TABS = [
    { key: "board", label: "Task Board", icon: ListChecks, count: tasks.length },
    { key: "transcript", label: "Transcript", icon: MessageSquare, count: segments.length },
    { key: "decisions", label: "Decisions", icon: CheckCircle2, count: decisions.length },
    { key: "ai", label: "AI Engine", icon: Sparkles, count: null },
  ] as const;

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1100px] space-y-5 py-4 font-sans text-[var(--text)]">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-mono shadow-2xl border transition-all ${
          toast.type === "error"
            ? "bg-[var(--panel)] border-[var(--red)] text-[var(--red)]"
            : "bg-[var(--panel)] border-[var(--primary)] text-[var(--text)]"
        }`}>
          <Zap size={13} className={toast.type === "error" ? "text-[var(--red)]" : "text-[var(--primary)]"} />
          {toast.msg}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--panel)] border border-[var(--red)]/40 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4 mx-4">
            <div className="flex items-center gap-2 text-[var(--red)] font-bold font-mono text-sm uppercase">
              <AlertTriangle size={16} /> Confirm Deletion
            </div>
            <p className="text-xs text-[var(--text-dim)] font-mono leading-relaxed">
              This will permanently delete <span className="font-bold text-[var(--text)]">"{meeting.title}"</span> including all tasks, decisions, transcripts, and AI insights. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-[var(--red)] text-white text-xs font-mono font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deleting ? "Deleting…" : "Delete Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Nav */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--primary)] transition-colors"
      >
        <ArrowLeft size={13} />
        <span>MEETINGS DIRECTORY</span>
      </Link>

      {/* ── Header Panel ── */}
      <div className="ops-panel p-5 border border-[var(--border)] bg-[var(--panel)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: Title & Meta */}
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <span className={`px-2 py-0.5 rounded font-bold uppercase border ${
                meeting.status === "Completed" ? "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30"
                : meeting.status === "In Progress" ? "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/30"
                : "bg-[var(--amber)]/12 text-[var(--amber)] border-[var(--amber)]/30"
              }`}>
                {meeting.status}
              </span>
              {meeting.department && (
                <span className="flex items-center gap-1 text-[var(--text-dim)] bg-[var(--panel-alt)] px-2 py-0.5 rounded border border-[var(--border)]">
                  <Building2 size={10} /> {meeting.department}
                </span>
              )}
              {meetUrl && (
                <span className="flex items-center gap-1 text-[var(--teal)] bg-[var(--teal)]/10 px-2 py-0.5 rounded border border-[var(--teal)]/30 font-bold">
                  <Video size={10} /> Google Meet
                </span>
              )}
            </div>

            <h1 className="font-display text-xl font-bold text-[var(--text)] tracking-wide leading-tight">
              {meeting.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[var(--text-dim)]">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {new Date(meeting.date).toLocaleString()}
              </span>
              {meeting.durationMins && (
                <span className="flex items-center gap-1">
                  <Activity size={11} /> {meeting.durationMins}m
                </span>
              )}
              {meeting.participants && (
                <span className="flex items-center gap-1">
                  <Users size={11} /> {meeting.participants}
                </span>
              )}
            </div>

            {meeting.objectives && (
              <p className="text-xs text-[var(--text-dim)] font-sans leading-relaxed border-l-2 border-[var(--primary)]/40 pl-3 mt-1">
                {meeting.objectives}
              </p>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/meeting/innovexa-meeting-${id}?meetingId=${id}`}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)] text-white px-3 py-2 text-xs font-mono font-bold hover:bg-[var(--primary-hover)] transition-all shadow-sm"
            >
              <Radio size={13} className="animate-pulse" />
              <span>JOIN LIVE ROOM</span>
            </Link>

            <button
              onClick={handleExtract}
              disabled={extracting}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--amber)]/60 bg-[var(--amber)]/10 text-[var(--amber)] px-3 py-2 text-xs font-mono font-bold hover:bg-[var(--amber)]/20 disabled:opacity-50 transition-all"
            >
              {extracting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              <span>{extracting ? "Extracting…" : "EXTRACT TASKS"}</span>
            </button>

            <button
              onClick={exportSummary}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors font-bold"
            >
              <FileText size={13} />
              <span>EXPORT MD</span>
            </button>

            <button
              onClick={() => fetchMeeting(true)}
              disabled={refreshing}
              className="p-2 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>

            {userRole === "organizer" && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 transition-colors"
                title="Delete meeting"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border)] font-mono">
          <div className="text-center space-y-0.5">
            <div className="text-xl font-bold text-[var(--text)]">{tasks.length}</div>
            <div className="text-[10px] uppercase text-[var(--text-dim)]">Total Tasks</div>
          </div>
          <div className="text-center space-y-0.5">
            <div className="text-xl font-bold text-[var(--teal)]">{completionPct}%</div>
            <div className="text-[10px] uppercase text-[var(--text-dim)]">Completion</div>
          </div>
          <div className="text-center space-y-0.5">
            <div className={`text-xl font-bold ${overdueCount > 0 ? "text-[var(--red)]" : "text-[var(--text)]"}`}>{overdueCount}</div>
            <div className="text-[10px] uppercase text-[var(--text-dim)]">Overdue</div>
          </div>
          <div className="text-center space-y-0.5">
            <div className="text-xl font-bold text-[var(--primary)]">{decisions.length}</div>
            <div className="text-[10px] uppercase text-[var(--text-dim)]">Decisions</div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        {tasks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-dim)]">
              <span>TASK COMPLETION PROGRESS</span>
              <span className="text-[var(--teal)] font-bold">{completedCount}/{tasks.length} resolved</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--panel-alt)] border border-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--teal)] transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto pb-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase whitespace-nowrap border-b-2 transition-all ${
                active
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border)]"
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  active ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--panel-alt)] text-[var(--text-dim)]"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Task Kanban Board ── */}
      {activeTab === "board" && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-xl space-y-3">
              <ListChecks size={28} className="mx-auto text-[var(--text-dim)]" />
              <p className="font-mono text-xs text-[var(--text-dim)]">No action items yet.</p>
              <button
                onClick={handleExtract}
                disabled={extracting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--amber)]/15 border border-[var(--amber)]/40 text-[var(--amber)] text-xs font-mono font-bold hover:bg-[var(--amber)]/25 transition-all disabled:opacity-50"
              >
                {extracting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                {extracting ? "Extracting from transcript…" : "Extract from AI Transcript"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-start">
              {KANBAN_COLS.map(col => {
                const colTasks = tasksByStatus[col.key] ?? [];
                return (
                  <div key={col.key} className="space-y-2.5">
                    {/* Column Header */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${col.bgClass}`}>
                      <span className={`font-mono text-xs font-bold uppercase ${col.colorClass}`}>{col.label}</span>
                      <span className={`text-sm font-bold font-display ${col.colorClass}`}>{colTasks.length}</span>
                    </div>
                    {/* Cards */}
                    <div className="space-y-2 min-h-[60px]">
                      {colTasks.length === 0 ? (
                        <p className="font-mono text-[10px] text-[var(--text-faint)] text-center py-3 italic">No tasks</p>
                      ) : (
                        colTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onStatusToggle={handleStatusToggle}
                            onReassign={handleReassign}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Transcript ── */}
      {activeTab === "transcript" && (
        <div className="space-y-3">
          {segments.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-xl">
              <MessageSquare size={28} className="mx-auto mb-2 text-[var(--text-dim)]" />
              <p className="font-mono text-xs text-[var(--text-dim)]">No transcript segments recorded yet.</p>
              <p className="font-mono text-[10px] text-[var(--text-faint)] mt-1">Join the Live Room and start Whisper recording to capture transcript.</p>
            </div>
          ) : (
            <div className="ops-panel p-4 border border-[var(--border)] bg-[var(--panel)] space-y-3 max-h-[600px] overflow-y-auto">
              {segments.map((seg, idx) => (
                <div key={seg.id ?? idx} className="flex gap-3 group">
                  <div className="w-20 shrink-0 text-right">
                    <span className="font-mono text-[10px] text-[var(--text-faint)]">{seg.timestamp}</span>
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="font-mono text-[10px] font-bold text-[var(--primary)]">{seg.speaker}</div>
                    <p className="text-xs text-[var(--text)] leading-relaxed">{seg.text}</p>
                  </div>
                  {seg.type && (
                    <span className={`shrink-0 px-1.5 py-0.5 text-[9px] rounded border font-mono font-bold uppercase self-start ${
                      seg.type === "decision" ? "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30" : "bg-[var(--panel-alt)] text-[var(--text-dim)] border-[var(--border)]"
                    }`}>
                      {seg.type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Decisions ── */}
      {activeTab === "decisions" && (
        <div className="space-y-3">
          {decisions.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-xl">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-[var(--text-dim)]" />
              <p className="font-mono text-xs text-[var(--text-dim)]">No decisions logged for this meeting.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {decisions.map((dec, idx) => (
                <div key={dec.id} className="ops-panel p-4 border border-[var(--border)] bg-[var(--panel)] flex gap-4">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center font-mono text-[11px] font-bold text-[var(--primary)]">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-xs text-[var(--text)]">{dec.title}</div>
                    {dec.description && (
                      <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{dec.description}</p>
                    )}
                    <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--text-dim)] pt-0.5">
                      {dec.department && <span className="flex items-center gap-1"><Building2 size={9} /> {dec.department}</span>}
                      <span><Clock size={9} className="inline mr-0.5" />{new Date(dec.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: AI Engine Panel ── */}
      {activeTab === "ai" && (
        <AIAgentPanel meetingId={id} meetingTitle={meeting?.title} />
      )}
    </div>
  );
}
