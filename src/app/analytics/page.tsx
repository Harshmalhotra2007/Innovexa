"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import heavy Recharts component with ssr: false
const AnalyticsCharts = dynamic(() => import("@/components/AnalyticsCharts"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-xs text-[#8FA0A4]">
      Loading Analytics Charts...
    </div>
  ),
});

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
        <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">
          Analytics & ROI Dashboard
        </h1>
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
          <div className="font-display text-2xl font-bold text-[#49B9AE]">
            {summary.closureRate}%
          </div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            DECISION LAG
          </div>
          <div className="font-display text-2xl font-bold text-[#E8A33D]">
            {summary.avgDecisionLagDays} Days
          </div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            OVERDUE RATE
          </div>
          <div className="font-display text-2xl font-bold text-[#E2666A]">
            {summary.overdueRate}%
          </div>
        </div>

        <div className="ops-panel p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#5B6A6E] mb-2">
            DECISIONS LOGGED
          </div>
          <div className="font-display text-2xl font-bold text-[#E7EEEF]">
            {summary.totalDecisions}
          </div>
        </div>
      </div>

      {/* Lazy Loaded Charts */}
      <AnalyticsCharts
        trendData={trendData}
        deptStats={deptStats}
        colors={COLORS}
      />
    </div>
  );
}

