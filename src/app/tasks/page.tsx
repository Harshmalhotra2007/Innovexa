"use client";

import { useEffect, useState, useCallback } from "react";
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
  LayoutGrid,
  List,
  Activity,
  ArrowRight,
  ChevronDown,
  Search,
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

const STATUS_CONFIG = {
  "Pending": {
    label: "Pending",
    badge: "PENDING",
    color: "text-[var(--amber)]",
    bg: "bg-[var(--amber)]/10",
    border: "border-[var(--amber)]/30",
    icon: Clock,
    description: "Extracted action items waiting for work to start.",
  },
  "In Progress": {
    label: "In Progress",
    badge: "IN PROGRESS",
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
    border: "border-[var(--primary)]/30",
    icon: Activity,
    description: "Active work in progress by assigned team leads.",
  },
  "Completed": {
    label: "Completed",
    badge: "COMPLETED",
    color: "text-[var(--teal)]",
    bg: "bg-[var(--teal)]/10",
    border: "border-[var(--teal)]/30",
    icon: CheckCircle2,
    description: "Resolved and verified meeting deliverables.",
  },
  "Overdue": {
    label: "Overdue",
    badge: "OVERDUE",
    color: "text-[var(--red)]",
    bg: "bg-[var(--red)]/10",
    border: "border-[var(--red)]/30",
    icon: AlertTriangle,
    description: "Past target resolution date. Requires immediate attention.",
  },
  "Escalated": {
    label: "Escalated",
    badge: "ESCALATED",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: Zap,
    description: "Passed 24h SLA threshold. Escalated to department manager.",
  },
} as const;

export default function TasksPage() {
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = useState<"all" | ActionTask["status"]>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newDeadline, setNewDeadline] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Re-assignee & status maps
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

  const updateTaskStatus = async (id: string, newStatus: ActionTask["status"]) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/tasks/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Task moved to ${newStatus}.`);
    } catch (error) {
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
    return Math.ceil((due - now) / (1000 * 3600 * 24));
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
          `SLA Audit Complete: ${data.processedCount || 0} tasks evaluated. ${summary.newOverdueCount || 0} overdue, ${summary.newEscalatedCount || 0} escalated.`
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

  const statusOrder: Array<ActionTask["status"]> = [
    "Pending",
    "In Progress",
    "Completed",
    "Overdue",
    "Escalated",
  ];

  // Aggregates & Filtered Tasks
  const filteredTasksList = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const overdueCount = tasks.filter((t) => t.status === "Overdue").length;
  const escalatedCount = tasks.filter((t) => t.status === "Escalated").length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const groupedTasks = statusOrder.reduce((acc, status) => {
    acc[status] = filteredTasksList.filter((t) => t.status === status);
    return acc;
  }, {} as Record<ActionTask["status"], ActionTask[]>);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 font-sans text-[var(--text)]">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-[var(--panel)] border border-[var(--primary)] px-4 py-2.5 text-xs font-mono text-[var(--text)] shadow-2xl animate-fade-in">
          <Zap size={14} className="text-[var(--primary)]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)]">
              <ListChecks size={18} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--text)] uppercase tracking-wide">
                Task SLA & Action Review Board
              </h1>
              <p className="text-xs text-[var(--text-dim)] font-mono mt-0.5">
                Centralized review dashboard for action items, resolution SLA timers, and escalation tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAuditSLA}
            disabled={isAuditingSLA}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--panel-alt)] border border-[var(--amber)]/40 text-xs font-mono text-[var(--amber)] hover:bg-[var(--panel)] transition-all disabled:opacity-50 shadow-sm"
          >
            <Zap size={14} className={isAuditingSLA ? "animate-spin" : ""} />
            <span>{isAuditingSLA ? "Auditing..." : "Run SLA Audit"}</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)]">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              <LayoutGrid size={13} /> Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                viewMode === "table"
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              <List size={13} /> List Table
            </button>
          </div>

          <div className="font-mono text-xs px-3.5 py-2 rounded-lg bg-[var(--teal)]/10 border border-[var(--teal)]/30 text-[var(--teal)] font-bold">
            {completionPct}% RESOLVED
          </div>
        </div>
      </div>

      {/* 🚨 SLA ALERT BANNER */}
      {(overdueCount > 0 || escalatedCount > 0) && (
        <div className="rounded-xl border border-[var(--red)]/40 bg-[var(--red)]/10 p-4 space-y-2 font-sans shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--red)] font-bold text-xs font-mono uppercase">
              <AlertTriangle size={16} className="animate-pulse" />
              <span>SLA Escalation Alert ({overdueCount + escalatedCount} Action Items Need Review)</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-dim)]">Automated Governance Engine Active</span>
          </div>
          <p className="text-xs text-[var(--text)] leading-relaxed">
            {escalatedCount > 0
              ? `${escalatedCount} task(s) exceeded the 24-hour SLA window and were escalated to department managers.`
              : `${overdueCount} task(s) are overdue past their deadline.`}{" "}
            Click on the metric cards below to review and resolve attention-required tasks.
          </p>
        </div>
      )}

      {/* 📊 KPI SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(
          [
            { key: "all", label: "TOTAL TASKS", count: totalCount, cfg: { color: "text-[var(--text)]", bg: "bg-[var(--panel-alt)]", border: "border-[var(--border)]", icon: Layers } },
            { key: "Pending", label: "PENDING", count: pendingCount, cfg: STATUS_CONFIG["Pending"] },
            { key: "In Progress", label: "IN PROGRESS", count: inProgressCount, cfg: STATUS_CONFIG["In Progress"] },
            { key: "Completed", label: "COMPLETED", count: completedCount, cfg: STATUS_CONFIG["Completed"] },
            { key: "Overdue", label: "OVERDUE", count: overdueCount, cfg: STATUS_CONFIG["Overdue"] },
            { key: "Escalated", label: "ESCALATED", count: escalatedCount, cfg: STATUS_CONFIG["Escalated"] },
          ] as const
        )
          .filter((item) => item.key !== "all")
          .map((item) => {
            const Icon = item.cfg.icon;
            const isSelected = statusFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setStatusFilter(isSelected ? "all" : item.key)}
                className={`p-3.5 rounded-xl border text-left transition-all ${item.cfg.bg} ${item.cfg.border} ${
                  isSelected ? "ring-2 ring-[var(--primary)] shadow-md" : "hover:border-[var(--primary)]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${item.cfg.color}`}>
                    {item.label}
                  </span>
                  <Icon size={14} className={item.cfg.color} />
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className={`font-display text-2xl font-bold ${item.cfg.color}`}>
                    {item.count}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-dim)]">
                    {totalCount > 0 ? `${Math.round((item.count / totalCount) * 100)}%` : "0%"}
                  </span>
                </div>
              </button>
            );
          })}
      </div>

      {/* SEARCH & QUICK FILTERS BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="text"
            placeholder="Search action items or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] mr-1 font-bold">Filter Status:</span>
          {(["all", "Pending", "In Progress", "Completed", "Overdue", "Escalated"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                statusFilter === f
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "bg-[var(--panel-alt)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              {f === "all" ? `All (${totalCount})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* ➕ QUICK ADD TASK PANEL */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] space-y-3">
        <div className="font-mono text-xs font-bold text-[var(--primary)] uppercase flex items-center gap-1.5">
          <Plus size={14} /> Quick Add Meeting Action Item
        </div>

        <form onSubmit={handleCreateTask} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1 font-bold">
                TASK TITLE *
              </label>
              <input
                required
                placeholder="e.g. Finalize architecture & deploy AI pipeline"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1 font-bold">
                ASSIGNEE
              </label>
              <input
                placeholder="e.g. Operations Lead"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1 font-bold">
                  PRIORITY
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1 font-bold">
                  DEADLINE
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating || !newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-bold font-mono hover:bg-[var(--primary)]/90 disabled:opacity-50 shadow-sm transition-all"
            >
              {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              <span>{isCreating ? "Adding..." : "+ CREATE TASK"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ──────────────────────────────────────────────────────────
          MAIN DISPLAY: KANBAN BOARD OR LIST TABLE
      ────────────────────────────────────────────────────────── */}

      {loading ? (
        <div className="py-16 text-center space-y-3 font-mono text-xs text-[var(--text-dim)]">
          <Loader2 size={24} className="animate-spin mx-auto text-[var(--primary)]" />
          <p>Loading action tasks and SLA parameters...</p>
        </div>
      ) : viewMode === "kanban" ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {statusOrder.map((statusKey) => {
            const colTasks = groupedTasks[statusKey] || [];
            const cfg = STATUS_CONFIG[statusKey];
            const StatusIcon = cfg.icon;

            return (
              <div
                key={statusKey}
                className={`rounded-xl border bg-[var(--panel)] p-4 min-h-[350px] space-y-3 transition-all ${
                  dragging?.taskId && dragging.sourceStatus === statusKey
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)]"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (dragging.taskId && dragging.sourceStatus !== statusKey) {
                    await updateTaskStatus(dragging.taskId, statusKey);
                  }
                  setDragging({ taskId: null, sourceStatus: null });
                }}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-center gap-2">
                    <StatusIcon size={14} className={cfg.color} />
                    <span className={`font-mono text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
                      {statusKey}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="py-10 text-center rounded-lg border border-dashed border-[var(--border)] p-4">
                      <p className="font-mono text-[11px] text-[var(--text-faint)] italic">
                        No {statusKey.toLowerCase()} tasks
                      </p>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isDone = task.status === "Completed";
                      const d = daysUntil(task.deadline);
                      const isUrgent = d !== null && d < 0 && !isDone;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer?.setData("text/plain", task.id);
                            setDragging({ taskId: task.id, sourceStatus: statusKey });
                          }}
                          onDragEnd={() => setDragging({ taskId: null, sourceStatus: null })}
                          className={`rounded-xl border p-3.5 space-y-3 bg-[var(--panel-alt)] transition-all hover:shadow-md ${
                            dragging?.taskId === task.id ? "opacity-50" : ""
                          } ${
                            isDone
                              ? "border-[var(--border)] opacity-80"
                              : isUrgent
                              ? "border-[var(--red)]/50 bg-[var(--red)]/5"
                              : "border-[var(--border)] hover:border-[var(--primary)]/40"
                          }`}
                        >
                          {/* Task Header & Check */}
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() =>
                                updateTaskStatus(task.id, isDone ? "Pending" : "Completed")
                              }
                              className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isDone
                                  ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                                  : "border-[var(--border)] hover:border-[var(--teal)]"
                              }`}
                              title={isDone ? "Reopen task" : "Mark completed"}
                            >
                              {isDone && <CheckCircle2 size={12} />}
                            </button>

                            <p
                              className={`text-xs font-semibold leading-relaxed flex-1 ${
                                isDone ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"
                              }`}
                            >
                              {task.task}
                            </p>
                          </div>

                          {/* Metadata Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
                            <span className="flex items-center gap-1 bg-[var(--panel)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-dim)]">
                              <User size={9} className="text-[var(--primary)]" />
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
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}

                            {task.deadline && (
                              <span
                                className={`flex items-center gap-1 font-bold ${
                                  isDone
                                    ? "text-[var(--text-faint)]"
                                    : isUrgent
                                    ? "text-[var(--red)]"
                                    : d !== null && d <= 2
                                    ? "text-[var(--amber)]"
                                    : "text-[var(--teal)]"
                                }`}
                              >
                                <Clock size={9} />
                                {isDone ? "Done" : isUrgent ? `Overdue ${Math.abs(d!)}d` : d === 0 ? "Today" : `${d}d`}
                              </span>
                            )}
                          </div>

                          {/* Interactive Actions Row */}
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/60">
                            {/* Quick Status Dropdown */}
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value as ActionTask["status"])}
                              className="px-2 py-1 rounded bg-[var(--panel)] border border-[var(--border)] font-mono text-[10px] font-bold text-[var(--text)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Overdue">Overdue</option>
                              <option value="Escalated">Escalated</option>
                            </select>

                            {/* Quick Reassign Input */}
                            <div className="flex items-center gap-1">
                              <input
                                placeholder="Reassign..."
                                value={reassignMap[task.id] || ""}
                                onChange={(e) =>
                                  setReassignMap((prev) => ({ ...prev, [task.id]: e.target.value }))
                                }
                                className="px-2 py-1 rounded bg-[var(--panel)] border border-[var(--border)] font-mono text-[10px] w-24 text-[var(--text)] placeholder-[var(--text-faint)]"
                              />
                              <button
                                onClick={() => handleReassign(task.id)}
                                disabled={!reassignMap[task.id]?.trim()}
                                className="p-1 rounded bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 disabled:opacity-30 transition-all"
                                title="Save assignee"
                              >
                                <Send size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STRUCTURED REVIEW TABLE VIEW */
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-alt)] font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  <th className="p-3.5">Action Item Title</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assignee</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Deadline / SLA</th>
                  <th className="p-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {filteredTasksList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-dim)] font-mono italic">
                      No matching tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasksList.map((task) => {
                    const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG["Pending"];
                    const isDone = task.status === "Completed";
                    const d = daysUntil(task.deadline);
                    const isUrgent = d !== null && d < 0 && !isDone;

                    return (
                      <tr key={task.id} className="hover:bg-[var(--panel-alt)]/50 transition-colors">
                        <td className="p-3.5 font-semibold text-[var(--text)]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateTaskStatus(task.id, isDone ? "Pending" : "Completed")
                              }
                              className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${
                                isDone ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--border)]"
                              }`}
                            >
                              {isDone && <CheckCircle2 size={10} />}
                            </button>
                            <span className={isDone ? "line-through text-[var(--text-faint)]" : ""}>
                              {task.task}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value as ActionTask["status"])}
                            className={`px-2.5 py-1 rounded border font-mono text-[10px] font-bold uppercase cursor-pointer ${cfg.bg} ${cfg.color} ${cfg.border}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Escalated">Escalated</option>
                          </select>
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-[var(--text-dim)]">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-[var(--primary)]" />
                            <span>{task.assignee}</span>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded border font-bold uppercase ${
                              task.priority === "High"
                                ? "bg-[var(--red)]/12 text-[var(--red)] border-[var(--red)]/30"
                                : task.priority === "Medium"
                                ? "bg-[var(--amber)]/12 text-[var(--amber)] border-[var(--amber)]/30"
                                : "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30"
                            }`}
                          >
                            {task.priority || "Medium"}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-[11px]">
                          {task.deadline ? (
                            <span
                              className={`flex items-center gap-1 font-bold ${
                                isDone
                                  ? "text-[var(--text-faint)]"
                                  : isUrgent
                                  ? "text-[var(--red)]"
                                  : d !== null && d <= 2
                                  ? "text-[var(--amber)]"
                                  : "text-[var(--teal)]"
                              }`}
                            >
                              <Clock size={12} />
                              {isDone ? "Done" : isUrgent ? `Overdue ${Math.abs(d!)}d` : d === 0 ? "Today" : `${d}d`}
                            </span>
                          ) : (
                            <span className="text-[var(--text-faint)] italic">No deadline</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              placeholder="Reassign..."
                              value={reassignMap[task.id] || ""}
                              onChange={(e) =>
                                setReassignMap((prev) => ({ ...prev, [task.id]: e.target.value }))
                              }
                              className="px-2 py-1 rounded bg-[var(--panel-alt)] border border-[var(--border)] font-mono text-[10px] w-28 text-[var(--text)]"
                            />
                            <button
                              onClick={() => handleReassign(task.id)}
                              disabled={!reassignMap[task.id]?.trim()}
                              className="p-1 rounded bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 disabled:opacity-30"
                            >
                              <Send size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}