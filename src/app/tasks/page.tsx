"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ListChecks,
  Circle,
  CheckCircle2,
  Bell,
  AlertTriangle,
  Clock,
  User,
  Zap,
  Trash2,
  Plus,
  Loader2,
  Layers,
} from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("organizer");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "overdue" | "pending" | "completed">("all");

  // New Task Form State (Visible inline)
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("Unassigned");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newDeadline, setNewDeadline] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
  );
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(sessionStorage.getItem("userRole") || "organizer");
    }
    fetchTasks();
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          ownerName: newOwner,
          priority: newPriority,
          deadline: newDeadline,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setToast("Task added successfully!");
        setTimeout(() => setToast(null), 3000);
        fetchTasks();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create task");
      }
    } catch (err: any) {
      alert("Error creating task: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Remove task "${title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setToast("Task removed!");
        setTimeout(() => setToast(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete task");
      }
    } catch (err: any) {
      alert("Error deleting task: " + err.message);
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
        fetchTasks();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch (err: any) {
      alert("Failed to assign task: " + err.message);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const sendReminder = (assignee: string) => {
    setToast(`⚡ SLA Nudge dispatched to ${assignee || "Assignee"}`);
    setTimeout(() => setToast(null), 3000);
  };

  const daysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getSlaBadge = (days: number | null, isDone: boolean) => {
    if (isDone) {
      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30">
          RESOLVED
        </span>
      );
    }
    if (days === null) {
      return (
        <span className="font-mono text-[10px] text-[var(--text-dim)] px-2 py-0.5 rounded bg-[var(--panel-alt)] border border-[var(--border)]">
          NO DEADLINE
        </span>
      );
    }
    if (days < 0) {
      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/35 animate-pulse flex items-center gap-1">
          <AlertTriangle size={10} /> {Math.abs(days)}D OVERDUE (BREACH)
        </span>
      );
    }
    if (days <= 2) {
      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--amber)]/15 text-[var(--amber)] border border-[var(--amber)]/35 flex items-center gap-1">
          <Clock size={10} /> DUE IN {days === 0 ? "TODAY" : `${days}D`}
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] text-[var(--teal)] px-2 py-0.5 rounded bg-[var(--teal)]/10 border border-[var(--teal)]/30">
        ON TRACK ({days}D)
      </span>
    );
  };

  // Metrics calculation
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const overdueCount = tasks.filter((t) => t.status !== "Completed" && daysUntil(t.deadline) !== null && (daysUntil(t.deadline) as number) < 0).length;
  const pendingCount = totalCount - completedCount;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    const days = daysUntil(t.deadline);
    const isDone = t.status === "Completed";

    if (activeFilter === "overdue") return !isDone && days !== null && days < 0;
    if (activeFilter === "pending") return !isDone;
    if (activeFilter === "completed") return isDone;
    return true;
  });

  return (
    <div className="mx-auto max-w-[840px] space-y-6 py-4">
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
          <h1 className="font-display text-xl font-bold text-[var(--text)] flex items-center gap-2">
            <ListChecks className="text-[var(--primary)] w-5 h-5" /> Task SLA & Action Board
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            Real-time tracking of extracted meeting action items and SLA resolution timers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-3 py-1 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--primary)] font-bold">
            {completionPct}% RESOLVED
          </span>
        </div>
      </div>

      {/* ➕ QUICK ADD NEW TASK PANEL */}
      <div className="ops-panel p-4 space-y-3 border border-[var(--primary)]/40 bg-[var(--panel-alt)]">
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
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--primary)] text-white text-xs font-bold font-mono hover:bg-[var(--primary-hover)] disabled:opacity-50 shadow-md"
            >
              {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              <span>{isCreating ? "Adding..." : "+ ADD TASK TO BOARD"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SLA Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="ops-panel p-3.5 border border-[var(--border)] bg-[var(--panel)] space-y-1">
          <div className="font-mono text-[10px] uppercase text-[var(--text-dim)] flex items-center justify-between">
            <span>TOTAL ITEMS</span>
            <Layers size={12} className="text-[var(--text-dim)]" />
          </div>
          <div className="font-display text-xl font-bold text-[var(--text)]">{totalCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[var(--red)]/40 bg-[var(--red-dim)] space-y-1">
          <div className="font-mono text-[10px] uppercase text-[var(--red)] flex items-center justify-between font-bold">
            <span>OVERDUE BREACHES</span>
            <AlertTriangle size={12} className="text-[var(--red)]" />
          </div>
          <div className="font-display text-xl font-bold text-[var(--red)]">{overdueCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[var(--amber)]/40 bg-[var(--amber)]/10 space-y-1">
          <div className="font-mono text-[10px] uppercase text-[var(--amber)] flex items-center justify-between font-bold">
            <span>PENDING TASKS</span>
            <Clock size={12} className="text-[var(--amber)]" />
          </div>
          <div className="font-display text-xl font-bold text-[var(--amber)]">{pendingCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[var(--teal)]/40 bg-[var(--teal)]/10 space-y-1">
          <div className="font-mono text-[10px] uppercase text-[var(--teal)] flex items-center justify-between font-bold">
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
              ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 font-bold"
              : "text-[var(--text-dim)] hover:text-[var(--text)] bg-[var(--panel-alt)]"
          }`}
        >
          PENDING ({pendingCount})
        </button>
        <button
          onClick={() => setActiveFilter("completed")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "completed"
              ? "bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30 font-bold"
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
                    ? "border-[var(--red)]/50 bg-[var(--red-dim)]"
                    : "border-[var(--border)] hover:border-[var(--primary)]/40"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTaskStatus(t.id, t.status)}
                    className="mt-0.5 text-[var(--text-faint)] hover:text-[var(--primary)] transition-colors shrink-0"
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
                      {t.title}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap font-mono text-[11px]">
                      {userRole === "organizer" ? (
                        <div className="flex items-center gap-1">
                          <User size={11} className="text-[var(--text-dim)]" />
                          <select
                            className="cyberpunk-select py-0.5 text-[10px]"
                            value={t.assigneeId || ""}
                            onChange={(e) => handleAssignTask(t.id, e.target.value)}
                            aria-label={`Assign task ${t.title}`}
                          >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="ops-badge border-[var(--border)] text-[var(--text-dim)]">
                          {t.ownerName || "Unassigned"}
                        </span>
                      )}

                      {getSlaBadge(d, isDone)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isDone && (
                    <button
                      onClick={() => sendReminder(t.ownerName)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--panel)] text-[11px] font-mono text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                      title="Send SLA Nudge"
                    >
                      <Zap size={12} />
                      <span>NUDGE SLA</span>
                    </button>
                  )}

                  {/* 🗑️ REMOVE TASK BUTTON */}
                  <button
                    onClick={() => handleDeleteTask(t.id, t.title)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--red)]/35 bg-[var(--red-dim)] text-[var(--red)] hover:bg-[var(--red)]/25 transition-colors"
                    title="Remove Task"
                    aria-label={`Remove task ${t.title}`}
                  >
                    <Trash2 size={13} />
                    <span className="hidden sm:inline">REMOVE</span>
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
