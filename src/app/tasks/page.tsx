"use client";

import { useEffect, useState } from "react";
import {
  ListChecks,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Loader2,
  Send,
  Zap,
  Filter,
  Layers,
} from "lucide-react";

interface ActionTask {
  id: string;
  task: string;
  assignee: string;
  deadline?: string | null;
  priority?: string;
  status: "Pending" | "Completed" | "In Progress";
  meetingId?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newDeadline, setNewDeadline] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Re-assignee state map
  const [reassignMap, setReassignMap] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "overdue" | "pending" | "completed">("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: newTitle,
          assignee: newOwner || "Unassigned",
          priority: newPriority,
          deadline: newDeadline || null,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setNewTitle("");
        setNewOwner("");
        setNewDeadline("");
        showToast("Task added to SLA action board.");
      }
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );

    try {
      await fetch(`/api/tasks/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Task status updated to ${nextStatus}.`);
    } catch (e) {
      console.error("Failed to toggle status:", e);
      fetchTasks();
    }
  };

  const handleReassign = async (id: string) => {
    const newOwnerName = reassignMap[id];
    if (!newOwnerName || !newOwnerName.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: newOwnerName.trim() }),
      });

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, assignee: newOwnerName.trim() } : t))
        );
        setReassignMap((prev) => ({ ...prev, [id]: "" }));
        showToast(`Task reassigned to ${newOwnerName.trim()}.`);
      }
    } catch (e) {
      console.error("Failed to reassign task:", e);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const daysUntil = (deadlineStr?: string | null) => {
    if (!deadlineStr) return null;
    const due = new Date(deadlineStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((due - now) / (1000 * 3600 * 24));
    return diff;
  };

  // Aggregates
  const totalCount = tasks.length;
  const overdueCount = tasks.filter((t) => {
    const d = daysUntil(t.deadline);
    return t.status !== "Completed" && d !== null && d < 0;
  }).length;
  const pendingCount = tasks.filter((t) => t.status !== "Completed").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    const days = daysUntil(t.deadline);
    const isDone = t.status === "Completed";

    if (activeFilter === "overdue") return !isDone && days !== null && days < 0;
    if (activeFilter === "pending") return !isDone;
    if (activeFilter === "completed") return isDone;
    return true;
  });

  return (
    <div className="mx-auto max-w-[840px] space-y-6 py-4 font-sans text-[var(--text)]">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded bg-[var(--panel)] border border-[var(--primary)] px-4 py-2 text-xs text-[var(--text)] shadow-2xl font-mono">
          <Zap size={14} className="text-[var(--primary)]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text)] flex items-center gap-2 uppercase">
            <ListChecks className="text-[var(--primary)] w-5 h-5" /> Task SLA & Action Board
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5 font-mono">
            Real-time tracking of extracted meeting action items and SLA resolution timers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-3 py-1 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--teal)] font-bold">
            {completionPct}% RESOLVED
          </span>
        </div>
      </div>

      {/* ➕ QUICK ADD NEW TASK PANEL */}
      <div className="ops-panel p-4 space-y-3 border border-[var(--border)] bg-[var(--panel)]">
        <div className="font-mono text-xs font-bold text-[var(--primary)] uppercase flex items-center gap-1.5">
          <Plus size={14} /> Quick Add Action Item
        </div>

        <form onSubmit={handleCreateTask} className="space-y-3">
          <div>
            <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1 font-bold">
              TASK TITLE *
            </label>
            <input
              required
              placeholder="e.g. Finalize Q3 Vendor Contract"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="ops-input w-full p-2.5 text-xs text-[var(--text)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1">
                ASSIGNEE
              </label>
              <input
                placeholder="e.g. Rahul Sharma"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="ops-input w-full p-2 text-xs"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1">
                PRIORITY
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="ops-input w-full p-2 text-xs font-mono"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1">
                DEADLINE
              </label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="ops-input w-full p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isCreating || !newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--primary)] text-white text-xs font-bold font-mono hover:bg-[var(--primary-hover)] disabled:opacity-50 shadow-sm"
            >
              {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              <span>{isCreating ? "Adding..." : "+ ADD TASK TO BOARD"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SLA Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="ops-panel p-3.5 border border-[var(--border)] bg-[var(--panel)] space-y-1">
          <div className="text-[10px] uppercase text-[var(--text-dim)] flex items-center justify-between">
            <span>TOTAL ITEMS</span>
            <Layers size={12} className="text-[var(--text-dim)]" />
          </div>
          <div className="font-display text-xl font-bold text-[var(--text)]">{totalCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[var(--red)]/30 bg-[var(--red)]/10 space-y-1">
          <div className="text-[10px] uppercase text-[var(--red)] flex items-center justify-between font-bold">
            <span>OVERDUE BREACHES</span>
            <AlertTriangle size={12} className="text-[var(--red)]" />
          </div>
          <div className="font-display text-xl font-bold text-[var(--red)]">{overdueCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[var(--amber)]/30 bg-[var(--amber)]/10 space-y-1">
          <div className="text-[10px] uppercase text-[var(--amber)] flex items-center justify-between font-bold">
            <span>PENDING TASKS</span>
            <Clock size={12} className="text-[var(--amber)]" />
          </div>
          <div className="font-display text-xl font-bold text-[var(--amber)]">{pendingCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[var(--teal)]/30 bg-[var(--teal)]/10 space-y-1">
          <div className="text-[10px] uppercase text-[var(--teal)] flex items-center justify-between font-bold">
            <span>RESOLVED</span>
            <CheckCircle2 size={12} className="text-[var(--teal)]" />
          </div>
          <div className="font-display text-xl font-bold text-[var(--teal)]">{completedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 font-mono text-xs flex-wrap">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "all"
              ? "bg-[var(--primary)] text-white font-bold"
              : "text-[var(--text-dim)] hover:text-[var(--text)] bg-[var(--panel-alt)]"
          }`}
        >
          ALL ({totalCount})
        </button>
        <button
          onClick={() => setActiveFilter("overdue")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "overdue"
              ? "bg-[var(--red)] text-white font-bold"
              : "text-[var(--text-dim)] hover:text-[var(--red)] bg-[var(--panel-alt)]"
          }`}
        >
          OVERDUE BREACHES ({overdueCount})
        </button>
        <button
          onClick={() => setActiveFilter("pending")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "pending"
              ? "bg-[var(--amber)]/20 text-[var(--amber)] border border-[var(--amber)]/40 font-bold"
              : "text-[var(--text-dim)] hover:text-[var(--text)] bg-[var(--panel-alt)]"
          }`}
        >
          PENDING ({pendingCount})
        </button>
        <button
          onClick={() => setActiveFilter("completed")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "completed"
              ? "bg-[var(--teal)]/20 text-[var(--teal)] border border-[var(--teal)]/40 font-bold"
              : "text-[var(--text-dim)] hover:text-[var(--text)] bg-[var(--panel-alt)]"
          }`}
        >
          RESOLVED ({completedCount})
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-[var(--text-dim)]">
            Loading SLA Board...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="ops-panel p-8 text-center text-xs font-mono text-[var(--text-dim)] border border-dashed border-[var(--border)]">
            No action items match the selected filter.
          </div>
        ) : (
          filteredTasks.map((t) => {
            const d = daysUntil(t.deadline);
            const isDone = t.status === "Completed";

            return (
              <div
                key={t.id}
                className={`ops-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-colors ${
                  isDone
                    ? "border-[var(--border)] opacity-75"
                    : d !== null && d < 0
                    ? "border-[var(--red)]/40 bg-[var(--red)]/10"
                    : "border-[var(--border)] hover:border-[var(--primary)]/40"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTaskStatus(t.id, t.status)}
                    className="mt-0.5 text-[var(--text-faint)] hover:text-[var(--teal)] transition-colors shrink-0"
                    title={isDone ? "Mark Pending" : "Mark Resolved"}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-[var(--teal)]" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div
                      className={`text-xs font-semibold ${
                        isDone ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"
                      }`}
                    >
                      {t.task}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-[var(--text-dim)]">
                      <span className="flex items-center gap-1 bg-[var(--panel-alt)] px-2 py-0.5 rounded border border-[var(--border)]">
                        <User size={10} className="text-[var(--primary)]" />
                        {t.assignee}
                      </span>

                      {t.priority && (
                        <span
                          className={`px-2 py-0.5 rounded border font-bold uppercase ${
                            t.priority === "High"
                              ? "bg-[var(--red)]/12 text-[var(--red)] border-[var(--red)]/30"
                              : t.priority === "Medium"
                              ? "bg-[var(--amber)]/12 text-[var(--amber)] border-[var(--amber)]/30"
                              : "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30"
                          }`}
                        >
                          {t.priority}
                        </span>
                      )}

                      {t.deadline && (
                        <span
                          className={`flex items-center gap-1 font-bold ${
                            isDone
                              ? "text-[var(--text-faint)]"
                              : d !== null && d < 0
                              ? "text-[var(--red)]"
                              : d !== null && d <= 2
                              ? "text-[var(--amber)]"
                              : "text-[var(--teal)]"
                          }`}
                        >
                          <Clock size={10} />
                          {isDone
                            ? "Done"
                            : d !== null && d < 0
                            ? `Overdue ${Math.abs(d)}d`
                            : d === 0
                            ? "Due today"
                            : `Due in ${d}d`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Re-assign Control */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <input
                    type="text"
                    placeholder="Re-assign..."
                    value={reassignMap[t.id] || ""}
                    onChange={(e) =>
                      setReassignMap((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                    className="ops-input px-2 py-1 text-[11px] w-28 font-mono placeholder-[var(--text-faint)] text-[var(--text)]"
                  />
                  <button
                    onClick={() => handleReassign(t.id)}
                    disabled={!reassignMap[t.id]?.trim()}
                    className="p-1 rounded border border-[var(--border)] bg-[var(--panel-alt)] text-[var(--primary)] hover:border-[var(--primary)] disabled:opacity-40 transition-colors"
                    title="Assign to owner"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
