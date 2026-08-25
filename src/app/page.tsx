"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  BarChart3,
  Bot,
  Sparkles,
  ArrowUpRight,
  Clock,
  RadioTower,
  Plus,
} from "lucide-react";

export default function HomeDashboard() {
  const [metrics, setMetrics] = useState({
    meetingsThisWeek: 12,
    openActionItems: 8,
    upcomingMeetings: 3,
    aiAccuracyRate: "98.5%",
  });

  const recentActivity = [
    { title: "Q3 Engineering Architecture & Roadmap Sync", time: "10 mins ago", status: "Processed", items: 4 },
    { title: "Design System & UI Components Review", time: "2 hours ago", status: "Processed", items: 2 },
    { title: "Executive Leadership Strategy Alignment", time: "Yesterday", status: "Completed", items: 6 },
  ];

  return (
    <div className="space-y-8 font-sans text-[#e8e1d5]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212B2E] pb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#e8e1d5] tracking-wide uppercase">
            OPERATIONS EXECUTIVE DASHBOARD
          </h1>
          <p className="text-xs font-mono text-[#9a99a0] mt-1">
            Real-time organizational memory, automated action items & meeting intelligence.
          </p>
        </div>

        <Link
          href="/meetings"
          className="px-4 py-2.5 rounded-lg bg-[#49B9AE] text-[#0D1A18] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#3ca298] transition-all shadow-lg shadow-[#49B9AE]/20 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>SCHEDULE MEETING</span>
        </Link>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl border border-[#212B2E] bg-[#182124] space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9a99a0]">
            <span>MEETINGS THIS WEEK</span>
            <CalendarDays className="w-4 h-4 text-[#49B9AE]" />
          </div>
          <div className="text-2xl font-bold text-[#e8e1d5]">{metrics.meetingsThisWeek}</div>
          <div className="text-[10px] text-[#49B9AE] flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +15% vs last week
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#212B2E] bg-[#182124] space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9a99a0]">
            <span>OPEN ACTION ITEMS</span>
            <CheckSquare className="w-4 h-4 text-[#E8A33D]" />
          </div>
          <div className="text-2xl font-bold text-[#E8A33D]">{metrics.openActionItems}</div>
          <div className="text-[10px] text-[#9a99a0]">4 SLA high priority</div>
        </div>

        <div className="p-4 rounded-xl border border-[#212B2E] bg-[#182124] space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9a99a0]">
            <span>UPCOMING MEETINGS</span>
            <Clock className="w-4 h-4 text-[#49B9AE]" />
          </div>
          <div className="text-2xl font-bold text-[#e8e1d5]">{metrics.upcomingMeetings}</div>
          <div className="text-[10px] text-[#49B9AE]">Next call in 45 mins</div>
        </div>

        <div className="p-4 rounded-xl border border-[#212B2E] bg-[#182124] space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9a99a0]">
            <span>AI ACCURACY RATE</span>
            <Sparkles className="w-4 h-4 text-[#E8A33D]" />
          </div>
          <div className="text-2xl font-bold text-[#49B9AE]">{metrics.aiAccuracyRate}</div>
          <div className="text-[10px] text-[#49B9AE]">Zero missing tasks</div>
        </div>
      </div>

      {/* Recent Activity & Quick Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-[#212B2E] bg-[#182124] space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#212B2E] pb-3">
            <h2 className="font-mono text-xs font-bold uppercase text-[#49B9AE] tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> RECENT MEETING ACTIVITY FEED
            </h2>
            <Link href="/meetings" className="font-mono text-xs text-[#9a99a0] hover:text-[#e8e1d5]">
              View All
            </Link>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {recentActivity.map((act, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-[#2B383C] bg-[#141C1F] flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-[#e8e1d5]">{act.title}</div>
                  <div className="text-[10px] text-[#9a99a0] flex items-center gap-3">
                    <span>{act.time}</span>
                    <span>•</span>
                    <span className="text-[#49B9AE]">{act.items} Action Items</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[#49B9AE]/20 text-[#49B9AE] border border-[#49B9AE]/30">
                  {act.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health Status Widget */}
        <div className="p-5 rounded-xl border border-[#212B2E] bg-[#182124] space-y-4 shadow-2xl font-mono text-xs">
          <div className="font-bold uppercase text-[#E8A33D] tracking-wider border-b border-[#212B2E] pb-3 flex items-center gap-2">
            <RadioTower className="w-4 h-4" /> SYSTEM RESILIENCE STATUS
          </div>
          <div className="space-y-2 text-[#9a99a0]">
            <div className="flex justify-between">
              <span>CIRCUIT BREAKER:</span>
              <span className="text-[#49B9AE] font-bold">CLOSED (HEALTHY)</span>
            </div>
            <div className="flex justify-between">
              <span>AUDIO VALIDATOR:</span>
              <span className="text-[#49B9AE] font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>DEAD LETTER QUEUE:</span>
              <span className="text-[#e8e1d5] font-bold">0 FAILED CHUNKS</span>
            </div>
            <div className="flex justify-between">
              <span>SELECTOR HEALTH:</span>
              <span className="text-[#49B9AE] font-bold">100% VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
