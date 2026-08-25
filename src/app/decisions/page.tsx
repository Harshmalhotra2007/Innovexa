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

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
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
        const data = await res.json();
        setDecisions(data || []);
      } else {
        // Fallback fetch from meetings if api route returns non-200
        const mRes = await fetch("/api/meetings");
        const mData = await mRes.json();
        const allDecisions = mData.flatMap((m: any) =>
          (m.decisions || []).map((d: any) => ({
            ...d,
            meeting: { id: m.id, title: m.title, date: m.date },
          }))
        );
        allDecisions.sort(
          (a: any, b: any) =>
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
          rationale: newRationale.trim() || null,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewContext("");
        setNewRationale("");
        setShowAddForm(false);
        setToast("Formal decision logged successfully!");
        setTimeout(() => setToast(null), 3000);
        fetchDecisions();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create decision");
      }
    } catch (err: any) {
      alert("Error saving decision: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDecision = async (id: string, title: string) => {
    if (!window.confirm(`Delete decision "${title}"?`)) return;

    try {
      const res = await fetch(`/api/decisions?decisionId=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDecisions((prev) => prev.filter((d) => d.id !== id));
        setToast("Decision removed!");
        setTimeout(() => setToast(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete decision");
      }
    } catch (err: any) {
      alert("Error removing decision: " + err.message);
    }
  };

  const exportMarkdownLog = () => {
    const header = `# INNOVEXA DECISION AUDIT TRAIL LOG\nGenerated: ${new Date().toLocaleString()}\n\n`;
    const body = decisions
      .map(
        (d, i) =>
          `### ${i + 1}. ${d.title}\n- **Department**: ${d.department}\n- **Date**: ${new Date(d.createdAt).toLocaleDateString()}\n- **Context**: ${d.context}\n- **Rationale**: ${d.rationale || "N/A"}\n`
      )
      .join("\n---\n\n");

    const blob = new Blob([header + body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Innovexa_Decisions_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const departments = [
    "All",
    "Engineering",
    "Design",
    "Marketing",
    "Sales",
    "Product",
    "Operations & Logistics",
    "Cybersecurity & Governance",
  ];

  const filtered = decisions.filter((d) => {
    const matchesDept = deptFilter === "All" || d.department === deptFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.context.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.rationale && d.rationale.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDept && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-4">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded bg-[#182124] border border-[#49B9AE] px-4 py-2 text-xs text-[#E7EEEF] shadow-2xl font-mono">
          <Sparkles size={14} className="text-[#49B9AE]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#212B2E] pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#E7EEEF] flex items-center gap-2">
            <GitCommit className="text-[#E8A33D] w-5 h-5" /> Decision History & Audit Trail
          </h1>
          <p className="text-xs text-[#8FA0A4] mt-0.5">
            Immutable timeline of formal organization decisions, contexts, and engineering rationales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportMarkdownLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#182124] border border-[#2B383C] text-xs font-mono text-[#8FA0A4] hover:text-[#E7EEEF] hover:border-[#49B9AE] transition-all"
            title="Export Markdown Log"
          >
            <Download size={13} />
            <span>EXPORT LOG</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#E8A33D] text-[#1A1305] text-xs font-bold font-mono hover:bg-[#d8932d] transition-all shadow-md"
          >
            <Plus size={14} />
            <span>{showAddForm ? "CLOSE FORM" : "LOG DECISION"}</span>
          </button>
        </div>
      </div>

      {/* Add New Decision Inline Form */}
      {showAddForm && (
        <div className="ops-panel p-4 space-y-3 border border-[#E8A33D]/40 bg-[#1D272B]">
          <div className="font-mono text-xs font-bold text-[#E8A33D] uppercase flex items-center gap-1.5">
            <Plus size={14} /> Record Formal Decision
          </div>

          <form onSubmit={handleCreateDecision} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-mono text-[10px] text-[#8FA0A4] uppercase block mb-1 font-bold">
                  DECISION TITLE *
                </label>
                <input
                  required
                  placeholder="e.g. Standardize PostgreSQL Pool Size to 20 Connections"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="ops-input w-full p-2 text-xs text-[#E7EEEF]"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#8FA0A4] uppercase block mb-1 font-bold">
                  DEPARTMENT
                </label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="ops-input w-full p-2 text-xs font-mono"
                >
                  {departments.filter((d) => d !== "All").map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-[#8FA0A4] uppercase block mb-1">
                BACKGROUND CONTEXT
              </label>
              <textarea
                rows={2}
                placeholder="Describe the context or problem statement driving this decision..."
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                className="ops-input w-full p-2 text-xs text-[#E7EEEF]"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-[#8FA0A4] uppercase block mb-1">
                ENGINEERING RATIONALE
              </label>
              <textarea
                rows={2}
                placeholder="Technical justification, benchmark findings, or architectural tradeoff rationale..."
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                className="ops-input w-full p-2 text-xs text-[#E7EEEF]"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving || !newTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#E8A33D] text-[#1A1305] text-xs font-bold font-mono hover:bg-[#d8932d] disabled:opacity-50 shadow-md"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                <span>{isSaving ? "Saving..." : "LOG FORMAL DECISION"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Controls Bar: Search & Department Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#141C1F] border border-[#212B2E]">
        <div className="sm:col-span-2 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[#8FA0A4]" />
          <input
            placeholder="Search decisions, contexts, or rationales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ops-input w-full pl-9 pr-3 py-1.5 text-xs text-[#E7EEEF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#8FA0A4] shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="ops-input text-xs py-1.5 px-3 rounded w-full font-mono"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === "All" ? "All Departments" : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Decision Timeline List */}
      {loading ? (
        <div className="text-center text-xs text-[#5B6A6E] py-12 font-mono">
          Loading decision audit trail...
        </div>
      ) : filtered.length === 0 ? (
        <div className="ops-panel p-8 text-center text-xs font-mono text-[#8FA0A4] border border-dashed border-[#2B383C]">
          No recorded decisions match your query.
        </div>
      ) : (
        <div className="relative border-l border-[#212B2E] ml-3.5 pl-6 space-y-6">
          {filtered.map((dec) => (
            <div key={dec.id} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-4 h-3 w-3 rounded-full border-2 border-[#E8A33D] bg-[#141C1F] group-hover:bg-[#E8A33D] transition-colors" />

              <div className="ops-panel p-4 space-y-3 border border-[#2B383C] hover:border-[#49B9AE]/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#212B2E] pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-[#E7EEEF]">{dec.title}</h3>
                    <div className="flex items-center gap-2.5 mt-1 font-mono text-[11px]">
                      <span className="text-[#49B9AE] flex items-center gap-1">
                        <Calendar size={11} /> {new Date(dec.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="text-[#E8A33D] font-semibold">{dec.department}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {dec.meeting && (
                      <Link
                        href={`/meetings/${dec.meeting.id || dec.meetingId}`}
                        className="text-[#8FA0A4] hover:text-[#E7EEEF] border border-[#2A363A] bg-[#182124] rounded px-2.5 py-1 text-[10px] font-mono flex items-center gap-1 transition-all"
                      >
                        <GitCommit size={11} /> Context Meeting
                      </Link>
                    )}

                    <button
                      onClick={() => handleDeleteDecision(dec.id, dec.title)}
                      className="p-1 rounded text-[#8FA0A4] hover:text-[#E2666A] hover:bg-[#2A181A] transition-colors"
                      title="Delete Decision"
                      aria-label={`Delete decision ${dec.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="bg-[#141C1F] p-3 rounded border border-[#212B2E] space-y-2 text-xs font-sans">
                  {dec.context && (
                    <div className="text-[#C5D0D3] leading-relaxed">
                      <span className="font-mono text-[10px] uppercase font-bold text-[#8FA0A4] block mb-0.5">
                        Context
                      </span>
                      {dec.context}
                    </div>
                  )}

                  {dec.rationale && (
                    <div className="text-[#E7EEEF] pt-2 border-t border-[#212B2E] leading-relaxed">
                      <span className="font-mono text-[10px] uppercase font-bold text-[#E8A33D] block mb-0.5">
                        Engineering Rationale
                      </span>
                      {dec.rationale}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
