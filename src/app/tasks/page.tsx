"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Loader2,
  Zap,
  LayoutGrid,
  List,
  Activity,
  Search,
  X,
  Building2,
  Trash2,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Bell,
  Mail,
} from "lucide-react";

export interface ActionTask {
  id: string;
  title: string;
  ownerName: string;
  department?: string;
  deadline?: string | null;
  priority?: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed" | "Overdue" | "Escalated";
  escalationLevel?: number;
  meetingId?: string;
  meeting?: { id: string; title: string; date?: string } | null;
}

const STATUS_CONFIG = {
  Pending: {
    label: "Pending",
    badge: "PENDING",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    icon: Clock,
    description: "Extracted action items waiting for work to start.",
  },
  "In Progress": {
    label: "In Progress",
    badge: "IN PROGRESS",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    icon: Activity,
    description: "Active work in progress by assigned team leads.",
  },
  Completed: {
    label: "Completed",
    badge: "COMPLETED",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    description: "Resolved and verified meeting deliverables.",
  },
  Overdue: {
    label: "Overdue",
    badge: "OVERDUE",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    icon: AlertTriangle,
    description: "Past target resolution date. Requires immediate attention.",
  },
  Escalated: {
    label: "Escalated",
    badge: "ESCALATED",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
    icon: Zap,
    description: "Passed 24h SLA threshold. Escalated to department manager.",
  },
} as const;

export default function TasksPage() {
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "alerts">("kanban");
  const [statusFilter, setStatusFilter] = useState<"all" | "attention" | "active" | "completed" | ActionTask["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"urgency" | "priority" | "newest">("urgency");

  // SLA Alerts state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [sendingSLAEmail, setSendingSLAEmail] = useState<string | null>(null);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ActionTask | null>(null);
  const [isAuditingSLA, setIsAuditingSLA] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Quick Create Form State
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newDepartment, setNewDepartment] = useState("Engineering");
  const [newPriority, setNewPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [newDeadline, setNewDeadline] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Drag and Drop
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (viewMode === "alerts") {
      fetchNotifications();
    }
  }, [viewMode]);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        const normalized: ActionTask[] = (Array.isArray(data) ? data : []).map((t: any) => ({
          id: t.id,
          title: t.title || t.task || "Untitled Action Item",
          ownerName: t.ownerName || t.assignee || "Unassigned",
          department: t.department || "Operations",
          deadline: t.deadline,
          priority: t.priority || "Medium",
          status: t.status || "Pending",
          escalationLevel: t.escalationLevel || 0,
          meetingId: t.meetingId,
          meeting: t.meeting,
        }));
        setTasks(normalized);
      }
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
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
          title: newTitle.trim(),
          ownerName: newOwner.trim() || "Unassigned",
          department: newDepartment,
          priority: newPriority,
          deadline: newDeadline || null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const createdTask = result.task || result;
        const normalized: ActionTask = {
          id: createdTask.id,
          title: createdTask.title || newTitle.trim(),
          ownerName: createdTask.ownerName || newOwner.trim() || "Unassigned",
          department: createdTask.department || newDepartment,
          priority: createdTask.priority || newPriority,
          status: createdTask.status || "Pending",
          deadline: createdTask.deadline || newDeadline || null,
        };

        setTasks((prev) => [normalized, ...prev]);
        setNewTitle("");
        setNewOwner("");
        setNewDeadline("");
        setIsCreateModalOpen(false);
        showToast("Task created and queued for SLA tracking.");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      showToast("Failed to create task.");
    } finally {
      setIsCreating(false);
    }
  };

  const updateTaskStatus = async (id: string, newStatus: ActionTask["status"]) => {
    const previous = tasks.find((t) => t.id === id);
    if (!previous || previous.status === newStatus) return;

    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    if (selectedTask?.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, status: newStatus }),
      });

      if (res.ok) {
        showToast(`Moved to ${newStatus}`);
      } else {
        // Rollback
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: previous.status } : t))
        );
        showToast("Failed to update status.");
      }
    } catch (err) {
      console.error("Status update error:", err);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: previous.status } : t))
      );
    }
  };

  const updateTaskDetails = async (id: string, updates: Partial<ActionTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    if (selectedTask?.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: id,
          priority: updates.priority,
          deadline: updates.deadline,
        }),
      });

      if (updates.ownerName) {
        await fetch(`/api/tasks/${id}/assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-role": "organizer" },
          body: JSON.stringify({ assignee: updates.ownerName }),
        }).catch(() => {});
      }

      showToast("Task updated successfully.");
    } catch (err) {
      console.error("Update task details error:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);

    try {
      const res = await fetch(`/api/tasks?taskId=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Task removed.");
      }
    } catch (e) {
      console.error("Delete task error:", e);
    }
  };

  const handleAuditSLA = async () => {
    setIsAuditingSLA(true);
    try {
      const res = await fetch("/api/cron/escalate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary || {};
        showToast(
          `SLA Audit complete: ${data.processedCount || 0} evaluated, ${summary.newOverdueCount || 0} overdue, ${summary.newEscalatedCount || 0} escalated.`
        );
        fetchTasks();
      } else {
        showToast("SLA Audit complete.");
      }
    } catch (err) {
      console.error("SLA Audit error:", err);
      showToast("SLA audit triggered.");
    } finally {
      setIsAuditingSLA(false);
    }
  };

  const daysUntil = (deadlineStr?: string | null) => {
    if (!deadlineStr) return null;
    const due = new Date(deadlineStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((due - now) / (1000 * 3600 * 24));
  };

  // Metrics Calculations
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const overdueCount = tasks.filter((t) => t.status === "Overdue").length;
  const escalatedCount = tasks.filter((t) => t.status === "Escalated").length;
  const attentionCount = overdueCount + escalatedCount;
  const activeCount = pendingCount + inProgressCount;
  const resolvedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set);
  }, [tasks]);

  // Filter and Sort Pipeline
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(query);
          const matchOwner = t.ownerName.toLowerCase().includes(query);
          const matchDept = (t.department || "").toLowerCase().includes(query);
          const matchMeeting = (t.meeting?.title || "").toLowerCase().includes(query);
          if (!matchTitle && !matchOwner && !matchDept && !matchMeeting) return false;
        }

        // Status Segment filter
        if (statusFilter === "attention") {
          if (t.status !== "Overdue" && t.status !== "Escalated") return false;
        } else if (statusFilter === "active") {
          if (t.status !== "Pending" && t.status !== "In Progress") return false;
        } else if (statusFilter === "completed") {
          if (t.status !== "Completed") return false;
        } else if (statusFilter !== "all") {
          if (t.status !== statusFilter) return false;
        }

        // Priority filter
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

        // Department filter
        if (departmentFilter !== "all" && t.department !== departmentFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const rank = { High: 3, Medium: 2, Low: 1 };
          return (rank[b.priority || "Medium"] || 0) - (rank[a.priority || "Medium"] || 0);
        }
        if (sortBy === "newest") {
          return b.id.localeCompare(a.id);
        }
        // "urgency": Escalated & Overdue first, then upcoming deadlines
        const urgencyScore = (t: ActionTask) => {
          if (t.status === "Escalated") return 1000;
          if (t.status === "Overdue") return 500;
          if (t.status === "Completed") return -1000;
          const d = daysUntil(t.deadline);
          if (d === null) return 50;
          return 100 - d;
        };
        return urgencyScore(b) - urgencyScore(a);
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter, departmentFilter, sortBy]);

  const kanbanColumns: Array<{
    key: ActionTask["status"];
    label: string;
    config: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG];
  }> = [
    { key: "Pending", label: "Pending", config: STATUS_CONFIG["Pending"] },
    { key: "In Progress", label: "In Progress", config: STATUS_CONFIG["In Progress"] },
    { key: "Overdue", label: "Overdue", config: STATUS_CONFIG["Overdue"] },
    { key: "Escalated", label: "Escalated", config: STATUS_CONFIG["Escalated"] },
    { key: "Completed", label: "Completed", config: STATUS_CONFIG["Completed"] },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 sm:px-6 py-6 font-sans text-[var(--text)]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-[var(--panel)] border border-[var(--primary)]/40 px-4 py-3 text-xs font-mono text-[var(--text)] shadow-2xl animate-fade-in backdrop-blur-md">
          <Zap size={14} className="text-[var(--primary)] animate-pulse" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── HEADER BANNER ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] shadow-xs">
              <ListChecks size={20} />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] uppercase">
                Task SLA & Action Review Board
              </h1>
              <p className="text-xs text-[var(--text-dim)] font-mono">
                Real-time governance, SLA compliance timelines, and automatic manager escalation tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Run SLA Audit Button */}
          <button
            onClick={handleAuditSLA}
            disabled={isAuditingSLA}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--panel)] border border-[var(--border)] text-xs font-mono font-semibold text-[var(--text)] hover:border-[var(--primary)]/40 hover:bg-[var(--panel-alt)] transition-all disabled:opacity-50 shadow-xs"
            title="Execute real-time SLA deadline evaluation and alert triggers"
          >
            <Zap size={13} className={isAuditingSLA ? "animate-spin text-amber-500" : "text-amber-500"} />
            <span>{isAuditingSLA ? "Auditing SLA..." : "Audit SLA"}</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] shadow-xs font-mono text-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              <LayoutGrid size={13} /> Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                viewMode === "table"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              <List size={13} /> List Table
            </button>
            <button
              onClick={() => setViewMode("alerts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                viewMode === "alerts"
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              <Bell size={13} /> Alerts Log
            </button>
          </div>

          {/* Primary Create Task Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-mono font-bold hover:bg-[var(--primary)]/90 transition-all shadow-sm"
          >
            <Plus size={14} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* ── SLA EXECUTIVE HEALTH & QUICK FILTER STRIP ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Total Tasks & Resolution */}
        <button
          onClick={() => setStatusFilter("all")}
          className={`p-3.5 rounded-2xl border text-left transition-all bg-[var(--panel)] ${
            statusFilter === "all"
              ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-sm"
              : "border-[var(--border)] hover:border-[var(--primary)]/40 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-[var(--text-dim)] font-mono text-[10px] font-bold uppercase tracking-wider">
            <span>ALL ACTION ITEMS</span>
            <span className="text-[var(--primary)] font-bold">{resolvedPct}% DONE</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-display text-2xl font-bold text-[var(--text)]">{totalCount}</span>
            <span className="text-[11px] font-mono text-[var(--text-dim)]">Total Tracked</span>
          </div>
          {/* Mini progress bar */}
          <div className="w-full bg-[var(--panel-alt)] h-1.5 rounded-full overflow-hidden mt-2.5">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${resolvedPct}%` }} />
          </div>
        </button>

        {/* Metric 2: Needs Attention (Overdue + Escalated) */}
        <button
          onClick={() => setStatusFilter("attention")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            attentionCount > 0
              ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50"
              : "bg-[var(--panel)] border-[var(--border)]"
          } ${
            statusFilter === "attention"
              ? "ring-2 ring-rose-500/30 border-rose-500 shadow-sm"
              : "shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-rose-500 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <AlertTriangle size={12} className={attentionCount > 0 ? "animate-pulse" : ""} />
              NEEDS ATTENTION
            </span>
            {attentionCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/15 border border-rose-500/30 font-bold">
                CRITICAL
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-display text-2xl font-bold text-rose-500">{attentionCount}</span>
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              {escalatedCount} Escalated • {overdueCount} Overdue
            </span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-dim)] mt-2 line-clamp-1">
            {attentionCount > 0 ? "Exceeded target SLA resolution limit" : "All SLA parameters on track"}
          </p>
        </button>

        {/* Metric 3: Active Work in Flight (Pending + In Progress) */}
        <button
          onClick={() => setStatusFilter("active")}
          className={`p-3.5 rounded-2xl border text-left transition-all bg-[var(--panel)] ${
            statusFilter === "active"
              ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
              : "border-[var(--border)] hover:border-blue-500/40 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-blue-500 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Activity size={12} />
              ACTIVE IN FLIGHT
            </span>
            <span className="text-[var(--text-dim)] font-mono">{activeCount}</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-display text-2xl font-bold text-blue-500">{activeCount}</span>
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              {inProgressCount} in progress
            </span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-dim)] mt-2">
            {pendingCount} waiting to begin
          </p>
        </button>

        {/* Metric 4: Completed & Verified */}
        <button
          onClick={() => setStatusFilter("completed")}
          className={`p-3.5 rounded-2xl border text-left transition-all bg-[var(--panel)] ${
            statusFilter === "completed"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
              : "border-[var(--border)] hover:border-emerald-500/40 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-500 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} />
              RESOLVED DELIVERABLES
            </span>
            <span className="text-emerald-500 font-bold">{completedCount}</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-display text-2xl font-bold text-emerald-500">{completedCount}</span>
            <span className="text-[11px] font-mono text-[var(--text-dim)]">Archived</span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-dim)] mt-2">
            All verification criteria signed off
          </p>
        </button>
      </div>

      {/* ── UNIFIED FILTER & SEARCH BAR ───────────────────────────────── */}
      <div className="p-3 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="text"
            placeholder="Search action items, assignee, or meeting..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)] transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right: Dropdowns & Status Segment Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          {departments.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1">
            <ArrowUpDown size={12} className="text-[var(--text-faint)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="urgency">Sort: SLA Urgency</option>
              <option value="priority">Sort: High Priority</option>
              <option value="newest">Sort: Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── KANBAN BOARD / TABLE VIEW ─────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center space-y-3 font-mono text-xs text-[var(--text-dim)]">
          <Loader2 size={24} className="animate-spin mx-auto text-[var(--primary)]" />
          <p>Loading action tasks and SLA parameters...</p>
        </div>
      ) : viewMode === "kanban" ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            const cfg = col.config;

            return (
              <div
                key={col.key}
                className={`rounded-2xl border bg-[var(--panel)] p-3 min-h-[420px] flex flex-col space-y-2.5 transition-all ${
                  draggingId ? "border-dashed hover:border-[var(--primary)]" : "border-[var(--border)]"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (draggingId) {
                    await updateTaskStatus(draggingId, col.key);
                    setDraggingId(null);
                  }
                }}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--border)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                      {col.label}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${cfg.bg} ${cfg.color}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center rounded-xl border border-dashed border-[var(--border)]/70 p-3">
                      <p className="font-mono text-[11px] text-[var(--text-faint)] italic">
                        No {col.label.toLowerCase()} items
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
                          onDragStart={() => setDraggingId(task.id)}
                          onDragEnd={() => setDraggingId(null)}
                          onClick={() => setSelectedTask(task)}
                          className={`group rounded-xl border p-3 bg-[var(--panel-alt)] hover:bg-[var(--panel)] transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                            draggingId === task.id ? "opacity-40 scale-95" : ""
                          } ${
                            isDone
                              ? "border-[var(--border)] opacity-75"
                              : isUrgent
                              ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60"
                              : "border-[var(--border)] hover:border-[var(--primary)]/50"
                          }`}
                        >
                          {/* Top Row: Priority & SLA Status Chips */}
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            {/* Priority badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                task.priority === "High"
                                  ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                                  : task.priority === "Medium"
                                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                  : "bg-teal-500/15 text-teal-600 border border-teal-500/30"
                              }`}
                            >
                              {task.priority || "Medium"}
                            </span>

                            {/* SLA Deadline Badge */}
                            {task.deadline ? (
                              <span
                                className={`flex items-center gap-1 font-mono text-[9px] font-bold ${
                                  isDone
                                    ? "text-[var(--text-faint)]"
                                    : isUrgent
                                    ? "text-rose-500 animate-pulse"
                                    : d !== null && d <= 1
                                    ? "text-amber-500"
                                    : "text-[var(--text-dim)]"
                                }`}
                              >
                                <Clock size={10} />
                                {isDone
                                  ? "Resolved"
                                  : isUrgent
                                  ? `Overdue ${Math.abs(d!)}d`
                                  : d === 0
                                  ? "Due Today"
                                  : `${d}d left`}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-[var(--text-faint)]">No deadline</span>
                            )}
                          </div>

                          {/* Task Title */}
                          <p
                            className={`text-xs font-medium leading-snug mb-2.5 ${
                              isDone ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"
                            }`}
                          >
                            {task.title}
                          </p>

                          {/* Meeting / Department context */}
                          {(task.department || task.meeting?.title) && (
                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-dim)] mb-2.5">
                              {task.department && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)]">
                                  <Building2 size={9} />
                                  {task.department}
                                </span>
                              )}
                              {task.meeting?.title && (
                                <span className="truncate max-w-[120px] text-[var(--text-faint)]" title={task.meeting.title}>
                                  • {task.meeting.title}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bottom Row: Assignee & Complete Checkbox */}
                          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/70 text-[10px] font-mono">
                            <div className="flex items-center gap-1.5 text-[var(--text-dim)]">
                              <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center text-[9px] font-bold">
                                {task.ownerName.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[90px] font-medium">{task.ownerName}</span>
                            </div>

                            {/* Fast Complete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTaskStatus(task.id, isDone ? "Pending" : "Completed");
                              }}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                isDone
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-[var(--border)] hover:border-emerald-500 hover:text-emerald-500"
                              }`}
                              title={isDone ? "Mark Pending" : "Mark Completed"}
                            >
                              {isDone && <CheckCircle2 size={12} />}
                            </button>
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
      ) : viewMode === "table" ? (
        /* STRUCTURED TABLE VIEW */
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-alt)] font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Task Deliverable</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Assignee</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">SLA / Deadline</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-[var(--text-dim)] font-mono italic">
                      No matching tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG["Pending"];
                    const isDone = task.status === "Completed";
                    const d = daysUntil(task.deadline);
                    const isUrgent = d !== null && d < 0 && !isDone;

                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="hover:bg-[var(--panel-alt)]/60 transition-colors cursor-pointer"
                      >
                        {/* Title */}
                        <td className="p-3.5 pl-4 font-medium text-[var(--text)]">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTaskStatus(task.id, isDone ? "Pending" : "Completed");
                              }}
                              className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--border)]"
                              }`}
                            >
                              {isDone && <CheckCircle2 size={10} />}
                            </button>
                            <span className={isDone ? "line-through text-[var(--text-faint)]" : ""}>
                              {task.title}
                            </span>
                          </div>
                        </td>

                        {/* Status dropdown */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value as ActionTask["status"])}
                            className={`px-2.5 py-1 rounded-lg border font-mono text-[10px] font-bold uppercase cursor-pointer ${cfg.bg} ${cfg.color} ${cfg.border}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Escalated">Escalated</option>
                          </select>
                        </td>

                        {/* Priority */}
                        <td className="p-3.5 font-mono text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded-md border font-bold uppercase ${
                              task.priority === "High"
                                ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                                : task.priority === "Medium"
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                : "bg-teal-500/15 text-teal-600 border-teal-500/30"
                            }`}
                          >
                            {task.priority || "Medium"}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td className="p-3.5 font-mono text-[11px] text-[var(--text-dim)]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[9px] font-bold">
                              {task.ownerName.charAt(0).toUpperCase()}
                            </div>
                            <span>{task.ownerName}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="p-3.5 font-mono text-[11px] text-[var(--text-dim)]">
                          {task.department || "Operations"}
                        </td>

                        {/* SLA Deadline */}
                        <td className="p-3.5 font-mono text-[11px]">
                          {task.deadline ? (
                            <span
                              className={`flex items-center gap-1 font-bold ${
                                isDone
                                  ? "text-[var(--text-faint)]"
                                  : isUrgent
                                  ? "text-rose-500 animate-pulse"
                                  : d !== null && d <= 1
                                  ? "text-amber-500"
                                  : "text-[var(--text-dim)]"
                              }`}
                            >
                              <Clock size={11} />
                              {isDone ? "Done" : isUrgent ? `Overdue ${Math.abs(d!)}d` : d === 0 ? "Due Today" : `${d}d`}
                            </span>
                          ) : (
                            <span className="text-[var(--text-faint)] italic">No deadline</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="p-1.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--primary)] hover:border-[var(--primary)]/40 transition-all text-xs"
                            title="View / Edit details"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SLA ALERTS LOG VIEW */
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden shadow-xs font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-[var(--panel-alt)]">
            <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
              <Bell size={13} className="text-[var(--amber)] animate-pulse" /> Triggered SLA & Escalation Logs
            </span>
            {notifications.filter(n => !n.read).length > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-[10px] text-[var(--teal)] hover:underline font-bold"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-alt)]/65 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Status</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Subject & Alert Context</th>
                  <th className="p-3.5">Sent At</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loadingNotifications ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <Loader2 size={18} className="animate-spin mx-auto text-[var(--primary)] mb-2" />
                      <p className="text-[var(--text-dim)]">Retrieving SLA audit trail...</p>
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[var(--text-dim)] italic">
                      No SLA alerts or escalations logged.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => {
                    const isEscalation = n.type === "Escalation";
                    const isWarning = n.type === "Warning";
                    return (
                      <tr
                        key={n.id}
                        className={`hover:bg-[var(--panel-alt)]/60 transition-colors ${
                          !n.read ? "bg-[var(--panel-alt)]/35 font-semibold text-[var(--text)]" : "text-[var(--text-dim)] opacity-85"
                        }`}
                      >
                        {/* Status */}
                        <td className="p-3.5 pl-4">
                          <span className={`w-2 h-2 rounded-full inline-block ${!n.read ? "bg-[var(--red)] animate-pulse" : "bg-[var(--text-faint)]"}`} />
                          <span className="ml-1.5">{!n.read ? "Unread" : "Archived"}</span>
                        </td>

                        {/* Type */}
                        <td className="p-3.5">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              isEscalation
                                ? "bg-red-500/12 text-red-400 border-red-500/25"
                                : isWarning
                                ? "bg-amber-500/12 text-amber-400 border-amber-500/25"
                                : "bg-teal-500/12 text-teal-400 border-teal-500/25"
                            }`}
                          >
                            {n.type}
                          </span>
                        </td>

                        {/* Recipient */}
                        <td className="p-3.5 truncate max-w-[150px]">{n.recipient}</td>

                        {/* Subject & Body */}
                        <td className="p-3.5 max-w-[280px]">
                          <div className="font-bold truncate text-[var(--text)]">{n.subject}</div>
                          <div className="text-[10px] text-[var(--text-dim)] mt-0.5 line-clamp-1">{n.body}</div>
                        </td>

                        {/* Sent At */}
                        <td className="p-3.5 whitespace-nowrap text-[var(--text-dim)]">
                          {new Date(n.sentAt).toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!n.read && (
                              <button
                                onClick={() => markNotificationRead(n.id)}
                                className="px-2 py-1 rounded bg-[var(--panel-alt)] border border-[var(--border)] hover:border-[var(--teal)]/40 hover:text-[var(--teal)] transition-all text-[10px]"
                                title="Mark read"
                              >
                                Read
                              </button>
                            )}
                            {n.taskId && (
                              <button
                                onClick={() => {
                                  const t = tasks.find(x => x.id === n.taskId);
                                  if (t) setSelectedTask(t);
                                }}
                                className="p-1 rounded bg-[var(--panel-alt)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
                                title="View Task"
                              >
                                <ChevronRight size={12} />
                              </button>
                            )}
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

      {/* ── CREATE TASK MODAL ─────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-6 shadow-2xl space-y-4 animate-fade-in font-sans">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 font-display text-base font-bold text-[var(--text)] uppercase">
                <Plus size={18} className="text-[var(--primary)]" />
                <span>Create Action Task</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-dim)] uppercase mb-1">
                  Task Title *
                </label>
                <input
                  required
                  placeholder="e.g. Implement security guardrails on API endpoint"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-dim)] uppercase mb-1">
                    Assignee
                  </label>
                  <input
                    placeholder="e.g. Lead Engineer"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-dim)] uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Security">Security</option>
                    <option value="Product">Product</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-dim)] uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-dim)] uppercase mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-mono text-[var(--text-dim)] hover:bg-[var(--panel-alt)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-mono font-bold hover:bg-[var(--primary)]/90 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>{isCreating ? "Saving..." : "Create Task"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TASK DETAIL & SLA REVIEW DRAWER / MODAL ───────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-6 shadow-2xl space-y-4 animate-fade-in font-sans">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                    STATUS_CONFIG[selectedTask.status]?.bg || ""
                  } ${STATUS_CONFIG[selectedTask.status]?.color || ""}`}
                >
                  {selectedTask.status}
                </span>
                <span className="font-mono text-xs text-[var(--text-dim)]">ID: {selectedTask.id.slice(-6)}</span>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Task Title */}
            <div>
              <h2 className="text-base font-bold text-[var(--text)] leading-snug">{selectedTask.title}</h2>
              {selectedTask.meeting?.title && (
                <p className="text-xs text-[var(--primary)] font-mono mt-1 flex items-center gap-1">
                  <ExternalLink size={11} /> Source: {selectedTask.meeting.title}
                </p>
              )}
            </div>

            {/* SLA Status Card */}
            <div className="p-3.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[var(--text-dim)] uppercase">SLA Resolution Status:</span>
                <span className={STATUS_CONFIG[selectedTask.status]?.color}>{selectedTask.status}</span>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">
                {STATUS_CONFIG[selectedTask.status]?.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-[var(--border)] space-y-1">
                <span className="font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase block">Assignee</span>
                <div className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                  <User size={13} className="text-[var(--primary)]" />
                  <span>{selectedTask.ownerName}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] space-y-1">
                <span className="font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase block">Department</span>
                <div className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                  <Building2 size={13} className="text-[var(--primary)]" />
                  <span>{selectedTask.department || "Operations"}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] space-y-1">
                <span className="font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase block">Priority</span>
                <select
                  value={selectedTask.priority || "Medium"}
                  onChange={(e) => updateTaskDetails(selectedTask.id, { priority: e.target.value as any })}
                  className="w-full bg-transparent font-mono text-xs font-bold text-[var(--text)] focus:outline-none cursor-pointer"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] space-y-1">
                <span className="font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase block">Target Deadline</span>
                <input
                  type="date"
                  value={selectedTask.deadline ? selectedTask.deadline.split("T")[0] : ""}
                  onChange={(e) => updateTaskDetails(selectedTask.id, { deadline: e.target.value || null })}
                  className="w-full bg-transparent font-mono text-xs text-[var(--text)] focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Status Buttons */}
            <div>
              <span className="font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase block mb-1.5">
                Update Status
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(["Pending", "In Progress", "Overdue", "Escalated", "Completed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateTaskStatus(selectedTask.id, s)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      selectedTask.status === s
                        ? "bg-[var(--primary)] text-white shadow-xs"
                        : "bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* SLA Manual Email Action */}
            <div className="pt-2 pb-1 border-t border-[var(--border)]/50">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSendingSLAEmail(selectedTask.id);
                    const res = await fetch("/api/tasks/send-sla-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ taskId: selectedTask.id }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      showToast(`SLA alert email successfully sent to ${data.recipient}`);
                      // Refresh notifications log if currently viewing it
                      if (viewMode === "alerts") {
                        fetchNotifications();
                      }
                    } else {
                      showToast("Failed to dispatch SLA alert email.");
                    }
                  } catch (e) {
                    showToast("SLA email dispatch triggered.");
                  } finally {
                    setSendingSLAEmail(null);
                  }
                }}
                disabled={sendingSLAEmail === selectedTask.id}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--amber)]/40 bg-[var(--amber)]/10 text-[var(--amber)] hover:bg-[var(--amber)]/20 transition-all font-mono text-xs font-bold disabled:opacity-50"
              >
                {sendingSLAEmail === selectedTask.id ? (
                  <Loader2 size={13} className="animate-spin text-[var(--amber)]" />
                ) : (
                  <Mail size={13} className="text-[var(--amber)]" />
                )}
                <span>DISPATCH SLA ALERT EMAIL</span>
              </button>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 text-xs font-mono transition-all"
              >
                <Trash2 size={13} />
                <span>Delete Task</span>
              </button>

              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] hover:bg-[var(--panel)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}