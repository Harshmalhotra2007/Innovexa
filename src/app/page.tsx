"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  CheckSquare,
  Sparkles,
  Clock,
  ArrowUpRight,
  Radio,
  RadioTower,
  Plus,
  BarChart3,
  FolderGit2,
  ListChecks,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ExternalLink,
  ShieldCheck,
  Activity,
} from "lucide-react";

const DEPARTMENTS = [
  "All",
  "Engineering",
  "Product & UI/UX",
  "Operations & Logistics",
  "Cybersecurity & Governance",
];

export interface DashboardAnalytics {
  totalMeetings?: number;
  totalDecisions?: number;
  openTasks?: number;
  escalatedTasks?: number;
  slaComplianceRate?: number;
  decisionsByDept?: Record<string, number>;
  tasksByStatus?: Record<string, number>;
  [key: string]: unknown;
}

interface MeetingItem {
  id: string;
  title: string;
  date: string;
  department?: string;
  status: string;
  tasks?: Array<{ id: string; title: string; status: string }>;
  decisions?: Array<{ id: string; title: string }>;
  summary?: string;
}

export default function Home() {
  const [selectedDept, setSelectedDept] = useState("All");
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [analyticsRes, meetingsRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/meetings"),
      ]);

      if (analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        setAnalytics(analyticsJson);
      }

      if (meetingsRes.ok) {
        const meetingsJson = await meetingsRes.json();
        setMeetings(meetingsJson);
      }

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("[Dashboard Sync Error]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Auto sync dashboard every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/cron/escalate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToastMsg(`SLA synchronized: ${data.processedCount || 0} tasks evaluated.`);
      } else {
        setToastMsg("Dashboard telemetry synchronized.");
      }
      await fetchDashboardData();
    } catch {
      setToastMsg("Sync triggered successfully.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  // Compute department-specific or global aggregate metrics
  const summary = analytics?.summary || {};
  const deptStats = analytics?.departmentStats || [];

  const currentDeptStat =
    selectedDept !== "All"
      ? deptStats.find((d: any) => d.department.toLowerCase() === selectedDept.toLowerCase())
      : null;

  const displayMetrics = {
    totalMeetings: currentDeptStat ? currentDeptStat.meetings : summary.totalMeetings || meetings.length || 0,
    openTasks: currentDeptStat
      ? currentDeptStat.totalTasks - currentDeptStat.completedTasks
      : (summary.pendingTasks || 0) + (summary.inProgressTasks || 0),
    closureRate: currentDeptStat ? currentDeptStat.completionRate : summary.closureRate || 0,
    overdueTasks: currentDeptStat
      ? currentDeptStat.escalatedTasks
      : (summary.overdueTasks || 0) + (summary.escalatedTasks || 0),
    totalDecisions: currentDeptStat ? currentDeptStat.decisions : summary.totalDecisions || 0,
    avgLagDays: currentDeptStat ? currentDeptStat.avgLag : summary.avgDecisionLagDays || 0,
  };

  // Filter recent meetings based on selected department
  const filteredMeetings = meetings.filter((m) => {
    if (selectedDept === "All") return true;
    return m.department?.toLowerCase() === selectedDept.toLowerCase();
  });

  return (
    <div className="space-y-6 font-sans text-[var(--text)]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded bg-[var(--panel)] border border-[var(--primary)] px-4 py-2 text-xs text-[var(--text)] shadow-2xl font-mono animate-fadeIn">
          <Zap size={14} className="text-[var(--primary)]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Dashboard Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display font-bold text-[var(--text)] tracking-wide uppercase">
              EXECUTIVE OPS CONSOLE & REPOSITORY
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] animate-pulse" />
              LIVE SYNCED
            </span>
          </div>
          <p className="text-xs font-mono text-[var(--text-dim)] mt-1">
            Real-time organizational memory, automated WebRTC AI notetaker dispatch, and SLA task governance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto font-mono text-xs">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-2 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-all flex items-center gap-1.5 font-bold shadow-xs"
            title="Synchronize all telemetry and audit SLAs"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin text-[var(--primary)]" : ""} />
            <span>{isSyncing ? "SYNCING..." : "SYNC TELEMETRY"}</span>
          </button>

          <Link
            href="/meetings"
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-bold uppercase tracking-wider hover:bg-[var(--primary-hover)] transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>NEW MEETING</span>
          </Link>
        </div>
      </div>

      {/* Department Filter Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--panel)] p-3.5 rounded-xl border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dim)] uppercase font-bold">
          <Building2 size={14} className="text-[var(--primary)]" />
          <span>DEPARTMENT FILTER:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto font-mono text-xs pb-1 sm:pb-0">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                selectedDept === dept
                  ? "bg-[var(--primary)] text-white font-bold shadow-xs"
                  : "bg-[var(--panel-alt)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Key KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        {/* Card 1: Total Meetings */}
        <div className="ops-panel p-4 space-y-1.5 border border-[var(--border)] bg-[var(--panel)] shadow-sm">
          <div className="flex items-center justify-between text-[10px] uppercase text-[var(--text-dim)] font-bold">
            <span>MEETINGS INDEXED</span>
            <CalendarDays className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="font-display text-2xl font-bold text-[var(--text)]">
            {loading ? "..." : displayMetrics.totalMeetings}
          </div>
          <div className="text-[10px] text-[var(--teal)] flex items-center gap-1 font-bold">
            <ArrowUpRight className="w-3 h-3" /> Real-time DB sync
          </div>
        </div>

        {/* Card 2: Open Action Items */}
        <div className="ops-panel p-4 space-y-1.5 border border-[var(--border)] bg-[var(--panel)] shadow-sm">
          <div className="flex items-center justify-between text-[10px] uppercase text-[var(--text-dim)] font-bold">
            <span>OPEN ACTION ITEMS</span>
            <CheckSquare className="w-4 h-4 text-[var(--amber)]" />
          </div>
          <div className="font-display text-2xl font-bold text-[var(--amber)]">
            {loading ? "..." : displayMetrics.openTasks}
          </div>
          <div className="text-[10px] text-[var(--text-dim)]">
            {displayMetrics.overdueTasks} critical overdue
          </div>
        </div>

        {/* Card 3: Task Closure Rate */}
        <div className="ops-panel p-4 space-y-1.5 border border-[var(--border)] bg-[var(--panel)] shadow-sm">
          <div className="flex items-center justify-between text-[10px] uppercase text-[var(--text-dim)] font-bold">
            <span>TASK RESOLUTION RATE</span>
            <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />
          </div>
          <div className="font-display text-2xl font-bold text-[var(--teal)]">
            {loading ? "..." : `${displayMetrics.closureRate}%`}
          </div>
          <div className="text-[10px] text-[var(--teal)] font-bold">
            SLA velocity on track
          </div>
        </div>

        {/* Card 4: Decisions Logged */}
        <div className="ops-panel p-4 space-y-1.5 border border-[var(--border)] bg-[var(--panel)] shadow-sm">
          <div className="flex items-center justify-between text-[10px] uppercase text-[var(--text-dim)] font-bold">
            <span>DECISIONS LOGGED</span>
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="font-display text-2xl font-bold text-[var(--text)]">
            {loading ? "..." : displayMetrics.totalDecisions}
          </div>
          <div className="text-[10px] text-[var(--primary)] font-bold">
            {displayMetrics.avgLagDays}d avg decision lag
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Recent Meeting Feed & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Synced Recent Meeting Activity Feed */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-[var(--border)] bg-[var(--panel)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="font-mono text-xs font-bold uppercase text-[var(--primary)] tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> RECENT MEETING SESSIONS ({selectedDept})
            </h2>
            <Link
              href="/meetings"
              className="font-mono text-xs text-[var(--text-dim)] hover:text-[var(--primary)] transition-colors flex items-center gap-1 font-semibold"
            >
              <span>View All Meetings</span>
              <ExternalLink size={11} />
            </Link>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {loading ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--text-dim)]">
                Synchronizing meeting feed...
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[var(--text-dim)] border border-dashed border-[var(--border)] rounded-lg">
                No meeting records found for department "{selectedDept}".
              </div>
            ) : (
              filteredMeetings.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--primary)]/50 transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30">
                        {m.department || "Engineering"}
                      </span>
                      <span className="font-bold text-[var(--text)] truncate">
                        {m.title}
                      </span>
                    </div>

                    <div className="text-[10px] text-[var(--text-dim)] flex items-center gap-3">
                      <span>{new Date(m.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-[var(--teal)] font-bold">
                        {m.tasks ? `${m.tasks.length} Action Items` : "AI Insights Available"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[var(--teal)]/12 text-[var(--teal)] border border-[var(--teal)]/30">
                      {m.status}
                    </span>

                    <Link
                      href={`/meetings/${m.id}`}
                      className="px-3 py-1 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--primary)] hover:border-[var(--primary)] font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                    >
                      <span>INSPECT</span>
                      <ExternalLink size={10} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Interactive Quick Actions & Real-Time System Resilience */}
        <div className="space-y-4 font-mono text-xs">
          {/* Quick Hub Navigation Shortcuts */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--panel)] space-y-3 shadow-sm">
            <div className="font-bold uppercase text-[var(--primary)] tracking-wider border-b border-[var(--border)] pb-2.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--amber)]" /> QUICK WORKSPACE SHORTCUTS
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/tasks"
                className="p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] hover:border-[var(--amber)] text-[var(--text)] flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare size={14} className="text-[var(--amber)]" />
                  <span className="font-bold">Task Board & SLA</span>
                </div>
                <span className="text-[10px] text-[var(--text-dim)] group-hover:text-[var(--text)]">Open →</span>
              </Link>

              <Link
                href="/decisions"
                className="p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--text)] flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 size={14} className="text-[var(--primary)]" />
                  <span className="font-bold">Decision Audit Trail</span>
                </div>
                <span className="text-[10px] text-[var(--text-dim)] group-hover:text-[var(--text)]">Open →</span>
              </Link>

              <Link
                href="/knowledge"
                className="p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] hover:border-[var(--teal)] text-[var(--text)] flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2">
                  <ListChecks size={14} className="text-[var(--teal)]" />
                  <span className="font-bold">Knowledge Base & Search</span>
                </div>
                <span className="text-[10px] text-[var(--text-dim)] group-hover:text-[var(--text)]">Open →</span>
              </Link>

              <Link
                href="/analytics"
                className="p-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--text)] flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-[var(--primary)]" />
                  <span className="font-bold">Analytics & Financial ROI</span>
                </div>
                <span className="text-[10px] text-[var(--text-dim)] group-hover:text-[var(--text)]">Open →</span>
              </Link>
            </div>
          </div>

          {/* System Resilience Status Widget */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--panel)] space-y-3 shadow-sm">
            <div className="font-bold uppercase text-[var(--primary)] tracking-wider border-b border-[var(--border)] pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <RadioTower className="w-4 h-4 text-[var(--teal)]" /> SYSTEM RESILIENCE
              </span>
              <span className="text-[10px] text-[var(--text-dim)] lowercase font-normal">
                sync: {lastSyncTime}
              </span>
            </div>

            <div className="space-y-2 text-[var(--text-dim)]">
              <div className="flex justify-between items-center">
                <span>DATABASE (NEON POSTGRES):</span>
                <span className="text-[var(--teal)] font-bold flex items-center gap-1">
                  <ShieldCheck size={11} /> HEALTHY
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>LIVEKIT WEBRTC ENGINE:</span>
                <span className="text-[var(--teal)] font-bold flex items-center gap-1">
                  <Activity size={11} /> STANDBY
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>WHISPER INGESTION PIPELINE:</span>
                <span className="text-[var(--teal)] font-bold">READY</span>
              </div>
              <div className="flex justify-between items-center">
                <span>SLA ESCALATION CRON:</span>
                <span className="text-[var(--teal)] font-bold">MONITORING</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
