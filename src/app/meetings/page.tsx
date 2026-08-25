"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Bot,
  Sparkles,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Radio,
  FileText,
} from "lucide-react";

interface MeetingItem {
  id: string;
  title: string;
  agenda?: string;
  date: string;
  status: "Scheduled" | "Processed" | "Failed";
  summaryPreview: string;
  actionItemsCount: number;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingItem[]>([
    {
      id: "meet-001",
      title: "Q3 Engineering Architecture & Roadmap Sync",
      agenda: "Review micro-services scaling and database connection pooling",
      date: "2026-08-25 14:00",
      status: "Processed",
      summaryPreview: "Agreed to adopt pooled Lakebase Postgres connection drivers and scale worker replicas.",
      actionItemsCount: 4,
    },
    {
      id: "meet-002",
      title: "Design System & UI Components Review",
      agenda: "Finalize Tactical Steel Slate palette tokens and accessibility standards",
      date: "2026-08-25 16:30",
      status: "Processed",
      summaryPreview: "Standardized #141C1F panel backgrounds and #49B9AE active indicators across console.",
      actionItemsCount: 2,
    },
    {
      id: "meet-003",
      title: "Executive Leadership Strategy Alignment",
      agenda: "Quarterly budget allocations and resource expansion plan",
      date: "2026-08-24 11:00",
      status: "Processed",
      summaryPreview: "Approved Q4 infrastructure expansion plan and budgeted 2 new SRE positions.",
      actionItemsCount: 6,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredMeetings = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.agenda && m.agenda.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans text-[#e8e1d5]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212B2E] pb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#e8e1d5] tracking-wide uppercase">
            MY MEETINGS & AI INTELLIGENCE
          </h1>
          <p className="text-xs font-mono text-[#9a99a0] mt-1">
            Search, inspect, and trigger meeting bot sessions and diarized audio transcripts.
          </p>
        </div>

        <Link
          href="/meetings/meet-001"
          className="px-4 py-2.5 rounded-lg bg-[#E8A33D] text-[#1a1f2d] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#c98a2d] transition-all shadow-lg shadow-[#E8A33D]/20 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Bot className="w-4 h-4" />
          <span>LAUNCH DEMO BOT SESSION</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5B6A6E] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search meetings by title, agenda, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#141C1F] border border-[#212B2E] text-xs font-mono text-[#E7EEEF] placeholder-[#5B6A6E] focus:outline-none focus:border-[#49B9AE]"
          />
        </div>
      </div>

      {/* Meetings Table View */}
      {filteredMeetings.length > 0 ? (
        <div className="rounded-xl border border-[#212B2E] bg-[#182124] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#141C1F] border-b border-[#212B2E] text-[#9a99a0] uppercase text-[10px]">
                <tr>
                  <th className="p-4">DATE & TIME</th>
                  <th className="p-4">MEETING TITLE</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4">AI SUMMARY PREVIEW</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212B2E]">
                {filteredMeetings.map((meet) => (
                  <tr key={meet.id} className="hover:bg-[#141C1F]/60 transition-colors">
                    <td className="p-4 text-[#9a99a0] whitespace-nowrap flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#49B9AE]" />
                      <span>{meet.date}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#e8e1d5]">{meet.title}</div>
                      <div className="text-[10px] text-[#5B6A6E] truncate max-w-xs">{meet.agenda}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded font-mono text-[10px] font-bold uppercase bg-[#49B9AE]/20 text-[#49B9AE] border border-[#49B9AE]/40 flex items-center gap-1.5 w-max">
                        <CheckCircle2 className="w-3 h-3 text-[#49B9AE]" /> {meet.status}
                      </span>
                    </td>
                    <td className="p-4 text-[#c5c0b8] text-[11px] max-w-sm">
                      {meet.summaryPreview}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/meetings/${meet.id}`}
                        className="px-3 py-1.5 rounded font-mono text-xs font-bold uppercase bg-[#49B9AE] text-[#0D1A18] hover:bg-[#3ca298] transition-all inline-flex items-center gap-1 shadow-md shadow-[#49B9AE]/20"
                      >
                        <span>VIEW INSIGHTS</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Smart Empty State */
        <div className="rounded-xl border border-dashed border-[#2B383C] bg-[#141C1F] p-12 text-center space-y-4 font-mono">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8A33D]/10 border border-[#E8A33D]/30 text-[#E8A33D] mx-auto">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#e8e1d5]">NO MEETINGS FOUND</h3>
            <p className="text-xs text-[#9a99a0]">Schedule your first AI-powered meeting to capture live transcripts and tasks.</p>
          </div>
          <Link
            href="/meetings/meet-001"
            className="px-4 py-2 rounded-lg bg-[#E8A33D] text-[#1a1f2d] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:bg-[#c98a2d] transition-all"
          >
            <Plus className="w-4 h-4" /> Schedule Your First AI-Powered Meeting
          </Link>
        </div>
      )}
    </div>
  );
}
