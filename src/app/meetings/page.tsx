"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScheduleMeetingModal } from "@/components/ScheduleMeetingModal";
import { UpcomingMeetingsView } from "@/components/UpcomingMeetingsView";
import {
  CalendarDays,
  Bot,
  Sparkles,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
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
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    <div className="space-y-6 font-sans text-[var(--text)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text)] tracking-wide uppercase">
            MEETING SCHEDULING & AI INTELLIGENCE
          </h1>
          <p className="text-xs font-mono text-[var(--text-dim)] mt-1">
            Pick dates & time slots, auto-generate Google Meet links, and manage AI Bot dispatch schedules.
          </p>
        </div>

        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" />
          <span>SCHEDULE NEW MEETING</span>
        </button>
      </div>

      {/* Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 rounded-lg font-bold uppercase transition-all flex items-center gap-2 ${
            activeTab === "upcoming"
              ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 shadow-sm"
              : "text-[var(--text-dim)] hover:bg-[var(--panel-alt)] hover:text-[var(--text)]"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>UPCOMING SCHEDULED MEETINGS</span>
        </button>

        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 rounded-lg font-bold uppercase transition-all flex items-center gap-2 ${
            activeTab === "past"
              ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 shadow-sm"
              : "text-[var(--text-dim)] hover:bg-[var(--panel-alt)] hover:text-[var(--text)]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>PAST PROCESSED MEETINGS</span>
        </button>
      </div>

      {/* Tab 1: Upcoming Scheduled Meetings */}
      {activeTab === "upcoming" && (
        <UpcomingMeetingsView
          key={refreshTrigger}
          onRefreshNeeded={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* Tab 2: Past Processed Meetings */}
      {activeTab === "past" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search past meetings by title, agenda, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--panel-alt)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
                  <tr>
                    <th className="p-4">DATE & TIME</th>
                    <th className="p-4">MEETING TITLE</th>
                    <th className="p-4">STATUS</th>
                    <th className="p-4">AI SUMMARY PREVIEW</th>
                    <th className="p-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredMeetings.map((meet) => (
                    <tr key={meet.id} className="hover:bg-[var(--panel-alt)]/60 transition-colors">
                      <td className="p-4 text-[var(--text-dim)] whitespace-nowrap flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>{meet.date}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-[var(--text)]">{meet.title}</div>
                        <div className="text-[10px] text-[var(--text-faint)] truncate max-w-xs">{meet.agenda}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded font-mono text-[10px] font-bold uppercase bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/40 flex items-center gap-1.5 w-max">
                          <CheckCircle2 className="w-3 h-3 text-[var(--teal)]" /> {meet.status}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-dim)] text-[11px] max-w-sm">
                        {meet.summaryPreview}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/meetings/${meet.id}`}
                          className="px-3 py-1.5 rounded font-mono text-xs font-bold uppercase bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all inline-flex items-center gap-1 shadow-md shadow-[var(--primary)]/20"
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
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}
