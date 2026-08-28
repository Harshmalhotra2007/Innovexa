"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  status: "Pending" | "In Progress" | "Completed" | "Overdue" | "Escalated";
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
  const [toast, setToast] = useState<string | null>(null);

  // Drag and drop state
  const [dragging, setDragging] = useState<{ taskId: string | null; sourceStatus: string | null }>({
    taskId: null,
    sourceStatus: null,
  });

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

  const updateTaskStatus = async (id: string, newStatus: ActionTask["status"] | string) => {
    const validStatus = newStatus as ActionTask["status"];
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: validStatus } : t
      )
    );

    try {
      await fetch(`/api/tasks/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: validStatus }),
      });
      showToast(`Task status updated to ${validStatus}.`);
    } catch (error) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: (dragging?.sourceStatus as ActionTask["status"]) ?? t.status }
            : t
        )
      );
      showToast("Failed to update task status.");
      console.error("Failed to update task status:", error);
    } finally {
      setDragging({ taskId: null, sourceStatus: null });
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

  const [isAuditingSLA, setIsAuditingSLA] = useState(false);

  const handleAuditSLA = async () => {
    setIsAuditingSLA(true);
    try {
      const res = await fetch("/api/cron/escalate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary || {};
        showToast(
          `SLA Audit Complete: ${data.processedCount || 0} tasks evaluated. ${summary.newOverdueCount || 0} overdue, ${summary.newEscalatedCount || 0} escalated, ${summary.notificationsCreated || 0} alerts dispatched.`
        );
        fetchTasks();
      } else {
        showToast("SLA Audit complete.");
      }
    } catch (err) {
      console.error("SLA Audit error:", err);
      showToast("Triggered SLA audit execution.");
    } finally {
      setIsAuditingSLA(false);
    }
  };

  // Status order for columns
  const statusOrder = ["Pending", "In Progress", "Completed", "Overdue", "Escalated"];

  // Group tasks by status
  const groupedTasks = statusOrder.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<string, ActionTask[]>);

  // Aggregates
  const totalCount = tasks.length;
  const overdueCount = tasks.filter((t) => {
    const d = daysUntil(t.deadline);
    return t.status !== "Completed" && (t.status === "Overdue" || (d !== null && d < 0));
  }).length;
  const pendingCount = tasks.filter((t) => t.status !== "Completed").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const escalatedCount = tasks.filter((t) => t.status === "Escalated").length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
          <button
            onClick={handleAuditSLA}
            disabled={isAuditingSLA}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--panel-alt)] border border-[var(--amber)]/40 text-xs font-mono text-[var(--amber)] hover:bg-[var(--panel)] transition-colors disabled:opacity-50"
          >
            <Zap size={13} className={isAuditingSLA ? "animate-spin" : ""} />
            <span>{isAuditingSLA ? "Auditing..." : "Run SLA Audit"}</span>
          </button>

          <span className="font-mono text-xs px-3 py-1 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--teal)] font-bold">
            {completionPct}% RESOLVED
          </span>
        </div>
      </div>

      {/* 🚨 SLA DEADLINE ALERT BANNER */}
      {(overdueCount > 0 || escalatedCount > 0) && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-2 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs font-mono uppercase">
              <AlertTriangle size={16} className="animate-pulse text-red-400" />
              <span>Active SLA Deadline Alerts ({overdueCount + escalatedCount} Action Items Need Attention)</span>
            </div>
            <span className="text-[10px] font-mono text-red-300/80">Automated Manager Escalation Loop Active</span>
          </div>
          <p className="text-xs text-[var(--text)] leading-relaxed">
            {escalatedCount > 0
              ? `${escalatedCount} task(s) have passed the 24-hour SLA window and were escalated to department managers.`
              : `${overdueCount} task(s) are past their resolution deadline.`}{" "}
            Automated SLA notifications & email alerts have been logged for compliance auditing.
          </p>
        </div>
      )}

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

      {/* Kanban Board */}
      <div className="grid gap-4 sm:grid-cols-5">
        {statusOrder.map((status) => (
          <div
            key={status}
            className={`border border-[var(--border)] rounded-lg bg-[var(--panel)] p-4 min-h-[200px] ${
              dragging?.taskId &&
              dragging.sourceStatus === status &&
              "border-[var(--primary)]/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault(); // Allow drop
            }}
            onDrop={async (e) => {
              e.preventDefault();
              if (dragging.taskId && dragging.sourceStatus !== status) {
                await updateTaskStatus(dragging.taskId, status);
              }
              setDragging({ taskId: null, sourceStatus: null });
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-lg font-bold text-[var(--text)]">
                {status}
              </h3>
              <span className="font-mono text-xs text-[var(--text-dim)]">
                {groupedTasks[status].length}
              </span>
            </div>
            <div className="space-y-2">
              {groupedTasks[status].length === 0 ? (
                <div className="text-center text-xs text-[var(--text-dim)] italic">
                  No tasks
                </div>
              ) : (
                groupedTasks[status].map((task) => (
                  <div
                    key={task.id}
                    className={`border border-[var(--border)] rounded-lg bg-[var(--panel-alt)] p-3 mb-2 ${
                      dragging?.taskId === task.id ? "opacity-50" : ""
                    }`}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer?.setData("text/plain", task.id);
                      setDragging({ taskId: task.id, sourceStatus: status });
                    }}
                    onDragEnd={() => {
                      setDragging({ taskId: null, sourceStatus: null });
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => updateTaskStatus(task.id, task.status === "Completed" ? "Pending" : "Completed")}
                        className="mt-0.5 text-[var(--text-faint)] hover:text-[var(--teal)] transition-colors shrink-0"
                        title={task.status === "Completed" ? "Mark Pending" : "Mark Resolved"}
                      >
                        {task.status === "Completed" ? (
                          <CheckCircle2 size={18} className="text-[var(--teal)]" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div
                          className={`text-xs font-semibold ${
                            task.status === "Completed"
                              ? "line-through text-[var(--text-faint)]"
                              : "text-[var(--text)]"
                          }`}
                        >
                          {task.task}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-[var(--text-dim)]">
                          <span className="flex items-center gap-1 bg-[var(--panel-alt)] px-2 py-0.5 rounded border border-[var(--border)]">
                            <User size={10} className="text-[var(--primary)]" />
                            {task.assignee}
                          </span>

                          {task.priority && (
                            <span
                              className={`px-2 py-0.5 rounded border font-bold uppercase ${
                                task.priority === "High"
                                  ? "bg-[var(--red)]/12 text-[var(--red)] border-[var(--red)]/30"
                                  : task.priority === "Medium"
                                  ? "bg-[var(--amber)]/12 text-[var(--amber)] border-[var(--amber)]/30"
                                  : "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30"
                              }`} >
                              {task.priority}
                            </span>
                          )}

                          {task.deadline && (() => {
                            const days = daysUntil(task.deadline);
                            return (
                              <span
                                className={`flex items-center gap-1 font-bold ${
                                  task.status === "Completed"
                                    ? "text-[var(--text-faint)]"
                                    : days !== null && days < 0
                                    ? "text-[var(--red)]"
                                    : days !== null && days <= 2
                                    ? "text-[var(--amber)]"
                                    : "text-[var(--teal)]"
                                }`} >
                                  <Clock size={10} />
                                  {task.status === "Completed"
                                    ? "Done"
                                    : days !== null && days < 0
                                      ? `Overdue ${Math.abs(days)}d`
                                      : days === 0
                                        ? "Due today"
                                        : `Due in ${days}d`}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Inline Re-assign Control */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                      <input
                        type="text"
                        placeholder="Re-assign..."
                        value={reassignMap[task.id] || ""}
                        onChange={(e) =>
                          setReassignMap((prev) => ({ ...prev, [task.id]: e.target.value }))}
                        className="ops-input px-2 py-1 text-[11px] w-28 font-mono placeholder-[var(--text-faint)] text-[var(--text)]"
                      />
                      <button
                        onClick={() => handleReassign(task.id)}
                        disabled={!reassignMap[task.id]?.trim()}
                        className="p-1 rounded border border-[var(--border)] bg-[var(--panel-alt)] text-[var(--primary)] hover:border-[var(--primary)] disabled:opacity-40 transition-colors"
                        title="Assign to owner"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}