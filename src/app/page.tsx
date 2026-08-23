"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  CircleCheck,
  Circle,
  Bell,
  ChevronRight,
  Plus,
  ListChecks,
} from "lucide-react";

export default function Home() {
  const [session, setSession] = useState({ name: "User", role: "organizer" });
  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = sessionStorage.getItem("username") || "User";
      const storedRole = sessionStorage.getItem("userRole") || "organizer";
      setSession({ name: storedName, role: storedRole });
    }
    loadDashboardData();
    fetchUsers();
  }, [departmentFilter]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }

  async function loadDashboardData() {
    try {
      const [mRes, tRes] = await Promise.all([
        fetch(`/api/meetings?department=${departmentFilter}`),
        fetch(`/api/tasks?department=${departmentFilter}`),
      ]);
      const mData = await mRes.json();
      const tData = await tRes.json();
      setMeetings(mData || []);
      setTasks(tData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const sendReminder = (assignee: string) => {
    setToast(`Reminder sent to ${assignee}`);
    setTimeout(() => setToast(null), 3000);
  };

  const remindAllPending = () => {
    const pendingAssignees = Array.from(
      new Set(tasks.filter((t) => t.status !== "Completed").map((t) => t.ownerName))
    );
    if (pendingAssignees.length === 0) return;
    setToast(`Reminder sent to ${pendingAssignees.join(", ")}`);
    setTimeout(() => setToast(null), 3500);
  };

  const handleDeleteMeeting = async (id: string) => {
    if (session.role !== "organizer") {
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
            "x-user-role": session.role,
          },
        });
        if (res.ok) {
          setMeetings((prev) => prev.filter((m) => m.id !== id));
          loadDashboardData();
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
    if (session.role !== "organizer") {
      alert("Forbidden: Only organizers can assign tasks.");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": session.role,
        },
        body: JSON.stringify({ assigneeId }),
      });
      if (res.ok) {
        loadDashboardData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch (err: any) {
      alert("Failed to assign task: " + err.message);
    }
  };

  const daysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const deadlineTone = (days: number | null) => {
    if (days === null) return "#5B6A6E";
    if (days < 0) return "#ff007f";
    if (days <= 2) return "#9f55ff";
    return "#00ffff";
  };

  const deadlineLabel = (days: number | null) => {
    if (days === null) return "no deadline";
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "due today";
    return `${days}d left`;
  };

  const priorityWeight = (p: string) => {
    if (p === "High") return 3;
    if (p === "Medium") return 2;
    if (p === "Low") return 1;
    return 0;
  };

  const pendingTasks = tasks
    .filter((t) => t.status !== "Completed")
    .filter((t) => assigneeFilter === "All" || t.ownerName === assigneeFilter)
    .filter((t) => priorityFilter === "All" || (t.priority || "Medium") === priorityFilter)
    .sort((a, b) => {
      const pDiff = priorityWeight(b.priority || "Medium") - priorityWeight(a.priority || "Medium");
      if (pDiff !== 0) return pDiff;
      const da = daysUntil(a.deadline) ?? 9999;
      const db = daysUntil(b.deadline) ?? 9999;
      return da - db;
    });

  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const overdueCount = pendingTasks.filter(
    (t) => daysUntil(t.deadline) !== null && (daysUntil(t.deadline) ?? 0) < 0
  ).length;

  const decisionsCount = meetings.reduce((n, m) => n + (m.decisions?.length || 0), 0);

  const uniqueAssignees = Array.from(new Set(tasks.map((t) => t.ownerName))).filter(Boolean);
  const departments = ["All", "Engineering", "Design", "Marketing", "Sales", "Product"];

  return (
    <div className="mx-auto max-w-[1040px] space-y-6 py-2">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-[#252542] border border-[#9f55ff] px-4.5 py-2.5 text-xs text-[#E7EEEF] shadow-2xl">
          <Bell size={14} className="text-[#9f55ff]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Welcome Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">
            Welcome back, {session.name}
          </h1>
          <p className="text-xs text-[#8FA0A4] mt-1">
            Here's where things stand across your meetings.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="ops-input text-xs py-1.5 px-3 rounded-md min-w-[120px]"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            UPCOMING MEETINGS
          </div>
          <div className="font-display text-2xl font-bold text-[#E7EEEF]">{meetings.length}</div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            PENDING TASKS
          </div>
          <div
            className="font-display text-2xl font-bold"
            style={{ color: pendingTasks.length > 0 ? "#9f55ff" : "#E7EEEF" }}
          >
            {pendingTasks.length}
          </div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            OVERDUE
          </div>
          <div
            className="font-display text-2xl font-bold"
            style={{ color: overdueCount > 0 ? "#ff007f" : "#E7EEEF" }}
          >
            {overdueCount}
          </div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            DECISIONS LOGGED
          </div>
          <div className="font-display text-2xl font-bold text-[#00ffff]">{decisionsCount}</div>
        </div>
      </div>

      {/* 2 Column Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Meetings Card */}
        <div className="ops-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2d2345] px-4 py-3">
            <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
              <Calendar size={14} className="text-[#9f55ff]" />
              <span>Upcoming meetings</span>
            </div>
            <Link
              href="/meetings"
              className="flex items-center gap-1 font-mono text-[11px] text-[#8FA0A4] hover:text-[#E7EEEF] border border-[#3e305e] rounded px-2 py-0.5"
            >
              <Plus size={12} /> NEW
            </Link>
          </div>

          <div className="divide-y divide-[#2d2345]">
            {meetings.length === 0 && (
              <div className="p-5 text-xs text-[#5B6A6E]">No meetings scheduled yet.</div>
            )}
            {meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center justify-between p-3.5 hover:bg-[#252542] transition-colors"
              >
                <div>
                  <div className="text-xs font-medium text-[#E7EEEF]">{m.title}</div>
                  <div className="flex items-center gap-3 mt-1 font-mono text-[11px] text-[#5B6A6E]">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(m.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {m.department || "General"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {session.role === "organizer" && (
                    <button
                      className="cyberpunk-btn delete-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteMeeting(m.id);
                      }}
                      aria-label={`Delete meeting ${m.title}`}
                    >
                      DELETE MEETING
                    </button>
                  )}
                  <ChevronRight size={15} className="text-[#5B6A6E]" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pending Tasks Card */}
        <div className="ops-panel overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[#2d2345] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
                <ListChecks size={14} className="text-[#9f55ff]" />
                <span>Pending tasks</span>
              </div>
              {pendingTasks.length > 0 && (
                <button
                  onClick={remindAllPending}
                  className="flex items-center gap-1 font-mono text-[10.5px] text-[#8FA0A4] hover:text-[#E7EEEF] border border-[#3e305e] rounded px-2 py-0.5"
                >
                  <Bell size={11} /> REMIND ALL
                </button>
              )}
            </div>
            {/* Task Filters */}
            <div className="flex items-center gap-2 mt-1">
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-[#1a1a2f] border border-[#2d2345] text-xs text-[#8FA0A4] rounded px-2 py-1 flex-1"
              >
                <option value="All">All Assignees</option>
                {uniqueAssignees.map((a) => (
                  <option key={a as string} value={a as string}>{a as string}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-[#1a1a2f] border border-[#2d2345] text-xs text-[#8FA0A4] rounded px-2 py-1 flex-1"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-[#2d2345]">
            {pendingTasks.length === 0 && (
              <div className="p-5 text-xs text-[#5B6A6E]">All clear — nothing pending.</div>
            )}
            {pendingTasks.map((t) => {
              const d = daysUntil(t.deadline);
              return (
                <div key={t.id} className="flex items-start gap-2.5 p-3.5">
                  <button
                    onClick={() => toggleTaskStatus(t.id, t.status)}
                    className="mt-0.5 text-[#5B6A6E] hover:text-[#00ffff]"
                  >
                    <Circle size={15} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#E7EEEF] leading-snug">{t.title}</div>
                    <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
                      {session.role === "organizer" ? (
                        <select
                          className="cyberpunk-select mr-2"
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
                        <span className="text-[#5B6A6E]">{t.ownerName}</span>
                      )}
                      <span className="text-[#8FA0A4] ml-1 uppercase text-[9px] border border-[#2d2345] px-1 rounded">{t.priority || "Medium"}</span>
                      <span style={{ color: deadlineTone(d) }} className="ml-1">{deadlineLabel(d)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => sendReminder(t.ownerName)}
                    title="Send reminder"
                    className="rounded border border-[#3e305e] p-1 text-[#8FA0A4] hover:border-[#9f55ff] hover:text-[#9f55ff]"
                  >
                    <Bell size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Completed Tasks Box */}
      {completedTasks.length > 0 && (
        <div className="ops-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#2d2345] px-4 py-3 font-body text-xs font-semibold text-[#E7EEEF]">
            <CircleCheck size={14} className="text-[#00ffff]" />
            <span>Completed ({completedTasks.length})</span>
          </div>
          <div className="divide-y divide-[#2d2345]">
            {completedTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => toggleTaskStatus(t.id, t.status)} className="text-[#00ffff]">
                    <CircleCheck size={15} />
                  </button>
                  <span className="line-through text-[#5B6A6E]">{t.title}</span>
                </div>
                <span className="font-mono text-[11px] text-[#5B6A6E]">{t.ownerName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

