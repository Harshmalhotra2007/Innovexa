"use client";

import React, { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-[#8FA0A4]">
        Computing Meeting Effectiveness Analytics...
      </div>
    );
  }

  const summary = data?.summary || {};
  const deptStats = data?.departmentStats || [];
  const trendData = data?.trendData || [];

  const COLORS = ["#49B9AE", "#E8A33D", "#E2666A", "#5B6A6E", "#8FA0A4"];

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">Analytics & ROI Dashboard</h1>
        <p className="text-xs text-[#8FA0A4] mt-1">
          Track task closure rates, decision lag, and department productivity metrics.
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            CLOSURE RATE
          </div>
          <div className="font-display text-2xl font-bold text-[#49B9AE]">{summary.closureRate}%</div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            DECISION LAG
          </div>
          <div className="font-display text-2xl font-bold text-[#E8A33D]">{summary.avgDecisionLagDays} Days</div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            OVERDUE RATE
          </div>
          <div className="font-display text-2xl font-bold text-[#E2666A]">{summary.overdueRate}%</div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            DECISIONS LOGGED
          </div>
          <div className="font-display text-2xl font-bold text-[#E7EEEF]">{summary.totalDecisions}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Task Closure Rate (Line Chart) */}
        <div className="ops-panel p-5 space-y-4">
          <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
            <CheckCircle2 size={14} className="text-[#49B9AE]" />
            <span>Task Closure Rate</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212B2E" />
                <XAxis dataKey="month" stroke="#8FA0A4" fontSize={10} />
                <YAxis stroke="#8FA0A4" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#182124", borderColor: "#2A363A", borderRadius: "6px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="tasksCreated" name="Created" stroke="#E8A33D" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completedTasks" name="Completed" stroke="#49B9AE" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Decision-to-action lag (Bar Chart) */}
        <div className="ops-panel p-5 space-y-4">
          <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
            <Clock size={14} className="text-[#E8A33D]" />
            <span>Decision-to-Action Lag (Days)</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212B2E" />
                <XAxis dataKey="department" stroke="#8FA0A4" fontSize={10} tickFormatter={(v) => v.split(" ")[0]} />
                <YAxis stroke="#8FA0A4" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#182124", borderColor: "#2A363A", borderRadius: "6px" }} />
                <Bar dataKey="avgLag" name="Avg Lag Days" fill="#E8A33D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overdue Trend (Area Chart) */}
        <div className="ops-panel p-5 space-y-4">
          <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
            <AlertCircle size={14} className="text-[#E2666A]" />
            <span>Overdue Task Trend</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212B2E" />
                <XAxis dataKey="month" stroke="#8FA0A4" fontSize={10} />
                <YAxis stroke="#8FA0A4" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#182124", borderColor: "#2A363A", borderRadius: "6px" }} />
                <Area type="monotone" dataKey="overdueTasks" name="Overdue" stroke="#E2666A" fill="#E2666A" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meetings per Department (Pie Chart) */}
        <div className="ops-panel p-5 space-y-4">
          <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
            <Building2 size={14} className="text-[#8FA0A4]" />
            <span>Meetings by Department</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptStats}
                  dataKey="meetings"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {deptStats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#182124", borderColor: "#2A363A", borderRadius: "6px", fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
