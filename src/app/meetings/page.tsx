"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  Search,
  ExternalLink,
  Bot,
  CheckCircle2,
  Clock,
  Radio,
  FileText,
} from "lucide-react";
import { ScheduleMeetingModal } from "@/components/ScheduleMeetingModal";
import { HostMeetingModal } from "@/components/HostMeetingModal";
import { UpcomingMeetingsView } from "@/components/UpcomingMeetingsView";

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  summary?: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const res = await fetch("/api/meetings");
        if (res.ok) {
          const data = await res.json();
          setMeetings(data);
        }
      } catch (err) {
        console.error("Error fetching meetings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMeetings();
  }, [refreshTrigger]);

  const filteredMeetings = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.summary && m.summary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans text-[var(--text)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[var(--primary)]" /> MY MEETINGS & AI NOTETAKER HUB
          </h1>
          <p className="text-xs font-mono text-[var(--text-dim)] mt-1">
            Schedule future meetings, host instant AI sessions, or review past executive AI summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsHostModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[var(--primary-hover)] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>HOST INSTANT MEETING</span>
          </button>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[var(--panel-alt)] text-[var(--text)] border border-[var(--border)] font-mono text-xs font-bold uppercase tracking-wider hover:border-[var(--primary)] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>SCHEDULE NEW MEETING</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 font-mono text-xs border-b border-[var(--border)] pb-3">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 rounded-lg font-bold uppercase transition-all flex items-center gap-2 ${
            activeTab === "upcoming"
              ? "bg-[var(--primary)] text-white shadow-sm"
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
              ? "bg-[var(--primary)] text-white shadow-sm"
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
        <div className="space-y-4 font-sans">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-dim)] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search past meetings by title, agenda, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden shadow-sm">
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
                    <tr key={meet.id} className="hover:bg-[var(--panel-alt)] transition-colors">
                      <td className="p-4 text-[var(--text-dim)] whitespace-nowrap">
                        {new Date(meet.date).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-[var(--text)]">
                        {meet.title}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[var(--teal)]/12 text-[var(--teal)] border border-[var(--teal)]/30">
                          {meet.status}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-dim)] max-w-xs truncate font-sans text-xs">
                        {meet.summary || "AI processing completed. Click to inspect notes."}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/meetings/${meet.id}`}
                          className="px-3 py-1.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--primary)] hover:border-[var(--primary)] font-bold text-xs inline-flex items-center gap-1.5 transition-all"
                        >
                          <span>INSPECT</span>
                          <ExternalLink className="w-3.5 h-3.5" />
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

      {/* Schedule Meeting Modal Component */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Host Instant Meeting Modal Component */}
      <HostMeetingModal
        isOpen={isHostModalOpen}
        onClose={() => setIsHostModalOpen(false)}
      />
    </div>
  );
}

