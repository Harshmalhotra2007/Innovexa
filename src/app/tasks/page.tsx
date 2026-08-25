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
  Filter,
  Check,
  Calendar,
  Layers,
} from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("organizer");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "overdue" | "pending" | "completed">("all");

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
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#1B3634] text-[#49B9AE] border border-[#49B9AE]/40">
          RESOLVED
        </span>
      );
    }
    if (days === null) {
      return (
        <span className="font-mono text-[10px] text-[#8FA0A4] px-2 py-0.5 rounded bg-[#141C1F] border border-[#212B2E]">
          NO DEADLINE
        </span>
      );
    }
    if (days < 0) {
      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#3A2224] text-[#E2666A] border border-[#E2666A]/50 animate-pulse flex items-center gap-1">
          <AlertTriangle size={10} /> {Math.abs(days)}D OVERDUE (BREACH)
        </span>
      );
    }
    if (days <= 2) {
      return (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#4A3A1E] text-[#E8A33D] border border-[#E8A33D]/50 flex items-center gap-1">
          <Clock size={10} /> DUE IN {days === 0 ? "TODAY" : `${days}D`}
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] text-[#49B9AE] px-2 py-0.5 rounded bg-[#142624] border border-[#49B9AE]/30">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded bg-[#182124] border border-[#E8A33D] px-4 py-2 text-xs text-[#E7EEEF] shadow-2xl font-mono">
          <Zap size={14} className="text-[#E8A33D]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#212B2E] pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#E7EEEF] flex items-center gap-2">
            <ListChecks className="text-[#E8A33D] w-5 h-5" /> Task SLA & Action Board
          </h1>
          <p className="text-xs text-[#8FA0A4] mt-0.5">
            Real-time tracking of extracted meeting action items and SLA resolution timers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-3 py-1 rounded bg-[#182124] border border-[#2B383C] text-[#E8A33D] font-bold">
            {completionPct}% RESOLVED
          </span>
        </div>
      </div>

      {/* SLA Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="ops-panel p-3.5 border border-[#2B383C] space-y-1">
          <div className="font-mono text-[10px] uppercase text-[#8FA0A4] flex items-center justify-between">
            <span>TOTAL ITEMS</span>
            <Layers size={12} className="text-[#8FA0A4]" />
          </div>
          <div className="font-display text-xl font-bold text-[#E7EEEF]">{totalCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[#E2666A]/40 bg-[#221517] space-y-1">
          <div className="font-mono text-[10px] uppercase text-[#E2666A] flex items-center justify-between font-bold">
            <span>OVERDUE BREACHES</span>
            <AlertTriangle size={12} className="text-[#E2666A]" />
          </div>
          <div className="font-display text-xl font-bold text-[#E2666A]">{overdueCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[#E8A33D]/40 bg-[#231B10] space-y-1">
          <div className="font-mono text-[10px] uppercase text-[#E8A33D] flex items-center justify-between font-bold">
            <span>PENDING TASKS</span>
            <Clock size={12} className="text-[#E8A33D]" />
          </div>
          <div className="font-display text-xl font-bold text-[#E8A33D]">{pendingCount}</div>
        </div>

        <div className="ops-panel p-3.5 border border-[#49B9AE]/40 bg-[#142624] space-y-1">
          <div className="font-mono text-[10px] uppercase text-[#49B9AE] flex items-center justify-between font-bold">
            <span>RESOLVED</span>
            <CheckCircle2 size={12} className="text-[#49B9AE]" />
          </div>
          <div className="font-display text-xl font-bold text-[#49B9AE]">{completedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#212B2E] pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "all"
              ? "bg-[#E8A33D] text-[#1A1305] font-bold"
              : "text-[#8FA0A4] hover:text-[#E7EEEF] bg-[#182124]"
          }`}
        >
          ALL ({totalCount})
        </button>
        <button
          onClick={() => setActiveFilter("overdue")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "overdue"
              ? "bg-[#E2666A] text-white font-bold"
              : "text-[#8FA0A4] hover:text-[#E2666A] bg-[#182124]"
          }`}
        >
          OVERDUE BREACHES ({overdueCount})
        </button>
        <button
          onClick={() => setActiveFilter("pending")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "pending"
              ? "bg-[#E8A33D]/20 text-[#E8A33D] border border-[#E8A33D]/40 font-bold"
              : "text-[#8FA0A4] hover:text-[#E7EEEF] bg-[#182124]"
          }`}
        >
          PENDING ({pendingCount})
        </button>
        <button
          onClick={() => setActiveFilter("completed")}
          className={`px-3 py-1.5 rounded transition-all ${
            activeFilter === "completed"
              ? "bg-[#49B9AE]/20 text-[#49B9AE] border border-[#49B9AE]/40 font-bold"
              : "text-[#8FA0A4] hover:text-[#E7EEEF] bg-[#182124]"
          }`}
        >
          RESOLVED ({completedCount})
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-[#8FA0A4]">
            Loading SLA Board...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="ops-panel p-8 text-center text-xs font-mono text-[#8FA0A4] border border-dashed border-[#2B383C]">
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
                    ? "border-[#212B2E] opacity-75"
                    : d !== null && d < 0
                    ? "border-[#E2666A]/50 bg-[#1D1617]"
                    : "border-[#2B383C] hover:border-[#49B9AE]/40"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTaskStatus(t.id, t.status)}
                    className="mt-0.5 text-[#5B6A6E] hover:text-[#49B9AE] transition-colors shrink-0"
                    title={isDone ? "Mark Pending" : "Mark Resolved"}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-[#49B9AE]" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div
                      className={`text-xs font-semibold ${
                        isDone ? "line-through text-[#5B6A6E]" : "text-[#E7EEEF]"
                      }`}
                    >
                      {t.title}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap font-mono text-[11px]">
                      {userRole === "organizer" ? (
                        <div className="flex items-center gap-1">
                          <User size={11} className="text-[#8FA0A4]" />
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
                        <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">
                          {t.ownerName || "Unassigned"}
                        </span>
                      )}

                      {getSlaBadge(d, isDone)}
                    </div>
                  </div>
                </div>

                {!isDone && (
                  <button
                    onClick={() => sendReminder(t.ownerName)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#2B383C] bg-[#182124] text-[11px] font-mono text-[#E8A33D] hover:border-[#E8A33D] transition-colors shrink-0"
                    title="Send SLA Nudge"
                  >
                    <Zap size={12} />
                    <span>NUDGE SLA</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
