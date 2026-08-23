"use client";

import React, { useState, useEffect } from "react";
import {
  ListChecks,
  Circle,
  CheckCircle2,
  Bell,
} from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

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
    setToast(`Reminder sent to ${assignee}`);
    setTimeout(() => setToast(null), 3000);
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

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-2">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-[#1D272B] border border-[#E8A33D] px-4.5 py-2.5 text-xs text-[#E7EEEF] shadow-2xl">
          <Bell size={14} className="text-[#E8A33D]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">Action items & SLA board</h1>
        <p className="text-xs text-[#8FA0A4] mt-1">
          Monitor tasks extracted from speech transcripts. Track deadlines and SLA levels.
        </p>
      </div>

      {/* Tasks Panel */}
      <div className="ops-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#212B2E] px-4 py-3">
          <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
            <ListChecks size={14} className="text-[#E8A33D]" />
            <span>All action items ({tasks.length})</span>
          </div>
        </div>

        <div className="divide-y divide-[#212B2E]">
          {tasks.map((t) => {
            const d = daysUntil(t.deadline);
            const isDone = t.status === "Completed";
            return (
              <div key={t.id} className="flex items-start gap-3 p-4">
                <button
                  onClick={() => toggleTaskStatus(t.id, t.status)}
                  className="mt-0.5 text-[#5B6A6E] hover:text-[#49B9AE]"
                >
                  {isDone ? <CheckCircle2 size={16} className="text-[#49B9AE]" /> : <Circle size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${isDone ? "line-through text-[#5B6A6E]" : "text-[#E7EEEF]"}`}>
                    {t.title}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 font-mono text-[11px]">
                    <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">{t.ownerName}</span>
                    <span className="ops-badge border-[#2A363A] text-[#E8A33D]">{t.department}</span>
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
    </div>
  );
}
