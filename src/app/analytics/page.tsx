"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calculator,
  Zap,
  Building2,
  Users,
} from "lucide-react";

// Dynamically import heavy Recharts component with ssr: false
const AnalyticsCharts = dynamic(() => import("@/components/AnalyticsCharts"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-xs text-[var(--text-dim)] font-mono">
      Loading Analytics Charts...
    </div>
  ),
});

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ROI Calculator Interactive Parameters
  const [hourlyRate, setHourlyRate] = useState<number>(65);
  const [avgAttendees, setAvgAttendees] = useState<number>(4);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        const resData = await res.json();
        setData(resData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const exportAnalyticsReport = () => {
    if (!data) return;

    const summary = data.summary || {};
    const totalMeetings = summary.totalMeetings || 12;
    const hoursSaved = Math.round(totalMeetings * 0.75 * avgAttendees);
    const moneySaved = hoursSaved * hourlyRate;

    const md = `# INNOVEXA EXECUTIVE ANALYTICS & ROI REPORT
Generated: ${new Date().toLocaleString()}

## 📊 Executive Summary
- **Total Meetings Processed**: ${totalMeetings}
- **Task Closure Rate**: ${summary.closureRate}%
- **Average Decision-to-Action Lag**: ${summary.avgDecisionLagDays} Days
- **Overdue SLA Rate**: ${summary.overdueRate}%
- **Total Decisions Logged**: ${summary.totalDecisions || 0}

## 💰 Financial ROI Breakdown
- **Estimated Hours Saved**: ${hoursSaved} Hours / Month
- **Assumed Hourly Cost**: $${hourlyRate}/hr (${avgAttendees} attendees/meeting)
- **Total Monthly Savings**: $${moneySaved.toLocaleString()}
`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Innovexa_Analytics_ROI_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-mono text-[var(--text-dim)]">
        Computing Meeting Effectiveness Analytics & Financial ROI...
      </div>
    );
  }

  const summary = data?.summary || {};
  const deptStats = data?.departmentStats || [];
  const trendData = data?.trendData || [];

  const totalMeetings = summary.totalMeetings || 12;
  const hoursSavedPerMeeting = 0.75; // 45 mins per meeting saved in manual notes & summary
  const totalHoursSaved = Math.round(totalMeetings * hoursSavedPerMeeting * avgAttendees);
  const totalDollarSavings = totalHoursSaved * hourlyRate;

  const COLORS = ["#0F9D8C", "#1D4ED8", "#EF4444", "#64748B", "#E2E8F0"];

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text)] flex items-center gap-2">
            <TrendingUp className="text-[var(--primary)] w-5 h-5" /> Analytics & Financial ROI Dashboard
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            Monitor organizational meeting efficiency, SLA resolution velocity, and calculated financial savings.
          </p>
        </div>

        <button
          onClick={exportAnalyticsReport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--primary)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-all shadow-sm"
        >
          <Download size={13} />
          <span>EXPORT ROI REPORT</span>
        </button>
      </div>

      {/* 💰 DYNAMIC FINANCIAL ROI BANNER */}
      <div className="ops-panel p-5 border border-[var(--teal)]/40 bg-[var(--teal)]/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-[var(--teal)] uppercase font-bold tracking-wider">
                ESTIMATED MONTHLY FINANCIAL ROI
              </div>
              <div className="font-display text-2xl font-bold text-[var(--text)] mt-0.5">
                ${totalDollarSavings.toLocaleString()}{" "}
                <span className="text-xs font-mono font-normal text-[var(--teal)]">saved / month</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs text-[var(--text-dim)]">
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-faint)] uppercase">TIME SAVED</div>
              <div className="font-bold text-[var(--teal)]">{totalHoursSaved} Hours</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-faint)] uppercase">MEETINGS INDEXED</div>
              <div className="font-bold text-[var(--primary)]">{totalMeetings} Sessions</div>
            </div>
          </div>
        </div>

        {/* Interactive ROI Calculator Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-3 bg-[var(--panel-alt)] p-2.5 rounded border border-[var(--border)]">
            <Calculator size={14} className="text-[var(--primary)] shrink-0" />
            <div className="flex-1">
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block">
                HOURLY EMPLOYEE COST ($/HR)
              </label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Math.max(1, parseInt(e.target.value) || 0))}
                className="ops-input w-full p-1 text-xs font-mono text-[var(--text)] bg-transparent border-0 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[var(--panel-alt)] p-2.5 rounded border border-[var(--border)]">
            <Users size={14} className="text-[var(--teal)] shrink-0" />
            <div className="flex-1">
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block">
                AVG ATTENDEES PER MEETING
              </label>
              <input
                type="number"
                value={avgAttendees}
                onChange={(e) => setAvgAttendees(Math.max(1, parseInt(e.target.value) || 0))}
                className="ops-input w-full p-1 text-xs font-mono text-[var(--text)] bg-transparent border-0 font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Key KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="ops-panel p-4 space-y-1 border border-[var(--border)] bg-[var(--panel)]">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
            TASK CLOSURE RATE
          </div>
          <div className="font-display text-2xl font-bold text-[var(--teal)]">
            {summary.closureRate}%
          </div>
        </div>

        <div className="ops-panel p-4 space-y-1 border border-[var(--border)] bg-[var(--panel)]">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
            AVG DECISION LAG
          </div>
          <div className="font-display text-2xl font-bold text-[var(--primary)]">
            {summary.avgDecisionLagDays} Days
          </div>
        </div>

        <div className="ops-panel p-4 space-y-1 border border-[var(--red)]/40 bg-[var(--red-dim)]">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--red)] font-bold">
            OVERDUE SLA RATE
          </div>
          <div className="font-display text-2xl font-bold text-[var(--red)]">
            {summary.overdueRate}%
          </div>
        </div>

        <div className="ops-panel p-4 space-y-1 border border-[var(--border)] bg-[var(--panel)]">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
            DECISIONS LOGGED
          </div>
          <div className="font-display text-2xl font-bold text-[var(--text)]">
            {summary.totalDecisions || 0}
          </div>
        </div>
      </div>

      {/* Lazy Loaded Recharts Visualizations Grid */}
      <AnalyticsCharts
        trendData={trendData}
        deptStats={deptStats}
        colors={COLORS}
      />
    </div>
  );
}
