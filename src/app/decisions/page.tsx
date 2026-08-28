"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitCommit,
  Filter,
  Search,
  Plus,
  Trash2,
  Download,
  Calendar,
  FileText,
  Building2,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface DecisionItem {
  id: string;
  title: string;
  department: string;
  context: string;
  rationale?: string | null;
  tags?: string[];
  createdAt: string;
  meeting?: {
    id: string;
    title: string;
    date: string;
  } | null;
}

interface RawMeetingData {
  id: string;
  title: string;
  date: string;
  decisions?: Array<{
    id: string;
    title: string;
    department: string;
    context: string;
    rationale?: string | null;
    tags?: string[];
    createdAt: string;
  }>;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // New Decision Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDepartment, setNewDepartment] = useState("Engineering");
  const [newContext, setNewContext] = useState("");
  const [newRationale, setNewRationale] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDecisions();
  }, []);

  async function fetchDecisions() {
    try {
      const res = await fetch("/api/decisions");
      if (res.ok) {
        const data: DecisionItem[] = await res.json();
        setDecisions(data || []);
      } else {
        const mRes = await fetch("/api/meetings");
        const mData: RawMeetingData[] = await mRes.json();
        const allDecisions: DecisionItem[] = mData.flatMap((m) =>
          (m.decisions || []).map((d) => ({
            ...d,
            meeting: { id: m.id, title: m.title, date: m.date },
          }))
        );
        allDecisions.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setDecisions(allDecisions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          department: newDepartment,
          context: newContext.trim() || "Formal organizational decision.",
          rationale: newRationale.trim() || "Approved by engineering review board.",
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setDecisions((prev) => [created, ...prev]);
        setNewTitle("");
        setNewContext("");
        setNewRationale("");
        setShowAddForm(false);
        showToast("Decision logged into audit trail.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDecision = async (id: string) => {
    try {
      const res = await fetch(`/api/decisions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDecisions((prev) => prev.filter((d) => d.id !== id));
        showToast("Decision record removed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportMarkdownLog = () => {
    const lines = ["# INNOVEXA DECISION AUDIT TRAIL LOG", ""];
    filteredDecisions.forEach((d, idx) => {
      lines.push(`## ${idx + 1}. ${d.title}`);
      lines.push(`- **Department**: ${d.department || "General"}`);
      lines.push(
        `- **Date Logged**: ${
          d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "Recent"
        }`
      );
      if (d.context) lines.push(`- **Context**: ${d.context}`);
      if (d.rationale) lines.push(`- **Rationale**: ${d.rationale}`);
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Innovexa_Decision_Log_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    showToast("Decision log exported as Markdown.");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const departments = ["All", "Engineering", "Product", "Executive", "Design", "Sales"];

  const filteredDecisions = decisions.filter((d) => {
    const matchesDept =
      deptFilter === "All" ||
      (d.department && d.department.toLowerCase() === deptFilter.toLowerCase());

    const matchesSearch =
      !searchQuery.trim() ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.context && d.context.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.rationale && d.rationale.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDept && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-4 font-sans text-[var(--text)]">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded bg-[var(--panel)] border border-[var(--primary)] px-4 py-2 text-xs text-[var(--text)] shadow-2xl font-mono">
          <Sparkles size={14} className="text-[var(--primary)]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--text)] flex items-center gap-2 uppercase">
            <GitCommit className="text-[var(--primary)] w-5 h-5" /> Decision History & Audit Trail
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5 font-mono">
            Immutable timeline of formal organization decisions, contexts, and engineering rationales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportMarkdownLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-all"
            title="Export Markdown Log"
          >
            <Download size={13} />
            <span>EXPORT LOG</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[var(--primary)] text-white text-xs font-bold font-mono hover:bg-[var(--primary-hover)] transition-all shadow-sm"
          >
            <Plus size={14} />
            <span>{showAddForm ? "CLOSE FORM" : "LOG DECISION"}</span>
          </button>
        </div>
      </div>

      {/* Add New Decision Inline Form */}
      {showAddForm && (
        <div className="ops-panel p-4 space-y-3 border border-[var(--border)] bg-[var(--panel)]">
          <div className="font-mono text-xs font-bold text-[var(--primary)] uppercase flex items-center gap-1.5">
            <Plus size={14} /> Record Formal Decision
          </div>

          <form onSubmit={handleCreateDecision} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1 font-bold">
                  DECISION TITLE *
                </label>
                <input
                  required
                  placeholder="e.g. Adopt Redis / BullMQ for Pre-Meeting Delayed Reminders"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="ops-input w-full p-2.5 text-xs text-[var(--text)]"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1 font-bold">
                  DEPARTMENT
                </label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="ops-input w-full p-2.5 text-xs font-mono"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Executive">Executive</option>
                  <option value="Design">Design</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1">
                BACKGROUND CONTEXT
              </label>
              <textarea
                rows={2}
                placeholder="Describe the operational problem or discussion leading to this decision..."
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                className="ops-input w-full p-2 text-xs"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase block mb-1">
                ENGINEERING RATIONALE & JUSTIFICATION
              </label>
              <textarea
                rows={2}
                placeholder="Technical reasons, tradeoffs evaluated, or SLA compliance impact..."
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                className="ops-input w-full p-2 text-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving || !newTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--primary)] text-white text-xs font-bold font-mono hover:bg-[var(--primary-hover)] disabled:opacity-50 shadow-sm"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                <span>{isSaving ? "Saving..." : "CONFIRM & LOG DECISION"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
          <input
            type="text"
            placeholder="Search decisions by title, context, or rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ops-input w-full pl-9 pr-3 py-2 text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)]"
          />
        </div>

        {/* Department Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto font-mono text-xs pb-1 sm:pb-0">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                deptFilter === dept
                  ? "bg-[var(--primary)] text-white font-bold shadow-xs"
                  : "bg-[var(--panel-alt)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions Timeline List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-[var(--text-dim)]">
            Loading Decision Audit Trail...
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="ops-panel p-8 text-center text-xs font-mono text-[var(--text-dim)] border border-dashed border-[var(--border)]">
            No decisions match the filter or search criteria.
          </div>
        ) : (
          filteredDecisions.map((d, index) => (
            <div
              key={d.id || index}
              className="ops-panel p-5 space-y-3 border border-[var(--border)] bg-[var(--panel)] shadow-sm hover:border-[var(--primary)]/40 transition-all relative group"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30">
                      {d.department || "Engineering"}
                    </span>
                    {d.meeting && (
                      <Link
                        href={`/meetings/${d.meeting.id}`}
                        className="text-[10px] font-mono text-[var(--text-dim)] hover:text-[var(--primary)] flex items-center gap-1"
                      >
                        <Calendar size={11} /> {d.meeting.title}
                      </Link>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-sm text-[var(--text)] tracking-wide">
                    {d.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-dim)]">
                  <span>
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "Logged Recently"}
                  </span>
                  <button
                    onClick={() => handleDeleteDecision(d.id)}
                    className="text-[var(--text-faint)] hover:text-[var(--red)] p-1 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Decision Record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Context & Rationale Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {d.context && (
                  <div className="p-3 rounded bg-[var(--panel-alt)] border border-[var(--border)] space-y-1">
                    <div className="font-mono text-[10px] uppercase text-[var(--text-dim)] font-bold flex items-center gap-1">
                      <FileText size={11} className="text-[var(--primary)]" /> BACKGROUND CONTEXT
                    </div>
                    <p className="text-[var(--text-dim)] leading-relaxed font-sans text-xs">{d.context}</p>
                  </div>
                )}

                {d.rationale && (
                  <div className="p-3 rounded bg-[var(--panel-alt)] border border-[var(--border)] space-y-1">
                    <div className="font-mono text-[10px] uppercase text-[var(--teal)] font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-[var(--teal)]" /> ENGINEERING RATIONALE
                    </div>
                    <p className="text-[var(--text-dim)] leading-relaxed font-sans text-xs">{d.rationale}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
