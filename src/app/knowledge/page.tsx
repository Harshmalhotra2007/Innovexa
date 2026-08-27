"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Search,
  Sparkles,
  Tag,
  ArrowRight,
  Database,
  FileText,
  AlertTriangle,
  FolderOpen,
  Calendar,
  CheckCircle2,
  Bot,
  Zap,
  HelpCircle,
  X,
  RefreshCw,
} from "lucide-react";

function KnowledgeSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [department, setDepartment] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "clusters">("search");

  // Topic Clusters and Contradictions states
  const [clusters, setClusters] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dismissedContradictions, setDismissedContradictions] = useState<Set<string>>(new Set());

  // AI QA State
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const presets = [
    "Adopt Dual Vector Storage",
    "ChromaDB vs Qdrant vector database",
    "48 hour SLA manager escalation policy",
    "Pydantic JSON schema validation",
  ];

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        runSearch(query, department, startDate, endDate);
      } else {
        runSearch("database decisions", department, startDate, endDate);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, department, startDate, endDate]);

  useEffect(() => {
    fetchClusters();
    fetchContradictions();
  }, [refreshTrigger]);

  async function fetchClusters() {
    try {
      const res = await fetch("/api/topic-clusters");
      if (res.ok) {
        const data = await res.json();
        setClusters(data);
      }
    } catch (err) {
      console.error("Failed to load clusters:", err);
    }
  }

  async function fetchContradictions() {
    try {
      const res = await fetch("/api/contradictions");
      if (res.ok) {
        const data = await res.json();
        setContradictions(data);
      }
    } catch (err) {
      console.error("Failed to load contradictions:", err);
    }
  }

  async function runSearch(qText: string, deptText: string, start?: string, end?: string) {
    if (!qText.trim()) return;
    setLoading(true);
    setAiAnswer(null);
    try {
      let url = `/api/search?q=${encodeURIComponent(qText)}&department=${encodeURIComponent(deptText)}`;
      if (start) url += `&startDate=${encodeURIComponent(start)}`;
      if (end) url += `&endDate=${encodeURIComponent(end)}`;

      const res = await fetch(url);
      const data = await res.json();
      setResults(data);

      // Generate instant AI synthesis answer from top results
      if (data && data.length > 0) {
        const topMatch = data[0];
        setAiAnswer(
          `Based on organizational memory search for "${qText}":\n\n` +
            `• Primary Insight (${topMatch.department}): "${topMatch.title}"\n` +
            `• Summary: ${topMatch.content}\n` +
            `• Similarity Match Confidence: ${Math.round((topMatch.score || 0.85) * 100)}%`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query, department, startDate, endDate);
  };

  const handleDismissContradiction = (id: string) => {
    setDismissedContradictions((prev) => new Set(prev).add(id));
  };

  const activeContradictions = contradictions.filter(
    (c) => !dismissedContradictions.has(c.id)
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Contradiction Alerts Section */}
      {activeContradictions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--red)]">
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>⚠️ REAL-TIME DECISION CONTRADICTION ALERTS ({activeContradictions.length})</span>
            </span>
          </div>
          <div className="space-y-2">
            {activeContradictions.map((contra) => (
              <div
                key={contra.id}
                className="bg-[var(--red-dim)] border border-[var(--red)]/40 rounded-lg p-4 space-y-3 text-xs leading-relaxed relative"
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--red)]">
                  <span>CONTRADICTION DETECTED IN TIMELINE</span>
                  <div className="flex items-center gap-3">
                    <span>Confidence: {Math.round(contra.confidence * 100)}%</span>
                    <button
                      onClick={() => handleDismissContradiction(contra.id)}
                      className="text-[var(--text-dim)] hover:text-[var(--red)] p-0.5"
                      title="Dismiss Alert"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--panel-alt)] p-3 rounded border border-[var(--border)]">
                    <div className="font-semibold text-[var(--primary)] mb-1">
                      Decision A: {contra.decision1.title}
                    </div>
                    <p className="text-[var(--text-dim)]">{contra.decision1.context}</p>
                    <div className="mt-2 text-[10px] text-[var(--text-faint)] font-mono">
                      Meeting: {contra.decision1.meeting?.title}
                    </div>
                  </div>
                  <div className="bg-[var(--panel-alt)] p-3 rounded border border-[var(--border)]">
                    <div className="font-semibold text-[var(--teal)] mb-1">
                      Conflicting Decision B: {contra.decision2.title}
                    </div>
                    <p className="text-[var(--text-dim)]">{contra.decision2.context}</p>
                    <div className="mt-2 text-[10px] text-[var(--text-faint)] font-mono">
                      Meeting: {contra.decision2.meeting?.title}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tab Selector */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-px">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "search"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            <Search size={14} /> Semantic Memory Search
          </button>
          <button
            onClick={() => setActiveTab("clusters")}
            className={`px-4 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "clusters"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            <FolderOpen size={14} /> Topic Clusters ({clusters.length})
          </button>
        </div>
      </div>

      {activeTab === "search" ? (
        <div className="space-y-6">
          {/* Search Inputs Card */}
          <div className="ops-panel p-5 space-y-4 border border-[var(--border)] bg-[var(--panel)]">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="relative">
                <Bot className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--primary)]" />
                <input
                  type="text"
                  placeholder="Ask Innovexa Knowledge Engine (e.g. 'What vector database decisions were made?')"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="ops-input w-full pl-10 pr-32 py-2.5 text-xs font-mono text-[var(--text)]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold font-mono text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 shadow-md shadow-[var(--primary)]/20"
                >
                  <Zap size={12} />
                  <span>{loading ? "Querying..." : "ASK KNOWLEDGE"}</span>
                </button>
              </div>

              {/* Filters Block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-mono text-[10px] uppercase text-[var(--text-dim)] block mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="ops-input w-full p-2 text-xs font-mono"
                  >
                    <option value="All">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Operations & Logistics">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-[var(--text-dim)] block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="ops-input w-full p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-[var(--text-dim)] block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="ops-input w-full p-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[var(--text-dim)] font-mono text-[11px]">Quick Queries:</span>
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setQuery(p);
                      runSearch(p, department, startDate, endDate);
                    }}
                    className="rounded border border-[var(--border)] bg-[var(--panel-alt)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors"
                  >
                    🔍 {p}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* AI Instant Synthesis Answer Box */}
          {aiAnswer && (
            <div className="ops-panel p-4 space-y-2 border border-[var(--primary)]/50 bg-[var(--panel-alt)]">
              <div className="font-mono text-xs font-bold text-[var(--primary)] uppercase flex items-center gap-1.5">
                <Sparkles size={14} /> AI Memory Synthesis Answer
              </div>
              <div className="text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed font-sans bg-[var(--bg-raised)] p-3.5 rounded border border-[var(--border)]">
                {aiAnswer}
              </div>
            </div>
          )}

          {/* Results Area */}
          <div className="space-y-3">
            <h2 className="font-display text-xs font-bold text-[var(--text)] flex items-center gap-2 uppercase tracking-wide">
              <Database size={14} className="text-[var(--teal)]" />
              <span>Semantic Memory Matches ({results.length})</span>
            </h2>

            {results.length === 0 ? (
              <div className="text-center py-10 text-xs text-[var(--text-faint)] bg-[var(--panel-alt)] rounded-lg border border-[var(--border)] font-mono">
                No semantic memory matches found for this query. Try adjusting your query or date range.
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((res, idx) => (
                  <div key={res.id || idx} className="ops-panel p-4 space-y-2 border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors bg-[var(--panel)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="ops-badge border-[var(--border)] bg-[var(--panel-alt)] text-[var(--primary)]">
                          {res.type}
                        </span>
                        <span className="ops-badge border-[var(--border)] text-[var(--text-dim)]">
                          {res.department}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--teal)] font-semibold">
                        Similarity Match: {Math.round((res.score || 0.8) * 100)}%
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-[var(--text)]">{res.title}</div>
                      <p className="text-xs text-[var(--text-dim)] mt-1.5 bg-[var(--panel-alt)] p-3 rounded border border-[var(--border)] leading-relaxed">
                        {res.content}
                      </p>
                    </div>

                    {res.meetingId && (
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-faint)]">
                        <span>Origin Meeting: {res.meetingTitle || "Record"} ({res.date})</span>
                        <Link href={`/meetings/${res.meetingId}`} className="text-[var(--primary)] hover:underline flex items-center gap-1">
                          <span>Trace Context</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Topic Clusters View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xs font-bold text-[var(--text)] flex items-center gap-2 uppercase tracking-wide">
              <FolderOpen size={14} className="text-[var(--teal)]" />
              <span>HDBSCAN Generative Clusters ({clusters.length})</span>
            </h2>
            <button
              onClick={() => setRefreshTrigger((t) => t + 1)}
              className="text-[10px] font-mono border border-[var(--border)] bg-[var(--panel-alt)] px-2.5 py-1 text-[var(--text-dim)] hover:text-[var(--text)] rounded flex items-center gap-1"
            >
              <RefreshCw size={11} /> REFRESH PIPELINE
            </button>
          </div>

          {clusters.length === 0 ? (
            <div className="text-center py-12 text-xs text-[var(--text-faint)] bg-[var(--panel-alt)] rounded-lg border border-[var(--border)] font-mono">
              No topic clusters found. Topic clusters generate automatically after multiple meetings are indexed.
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="ops-panel p-5 space-y-3 border border-[var(--border)] bg-[var(--panel)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--primary)]">
                        CLUSTER: {cluster.id.toUpperCase()}
                      </span>
                      {cluster.keywords.map((kw: string) => (
                        <span key={kw} className="ops-badge border-[var(--border)] bg-[var(--panel-alt)] text-[var(--teal)] text-[10px]">
                          #{kw}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-faint)]">
                      {cluster.decisions?.length || 0} decisions linked
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--border)] bg-[var(--panel-alt)] p-3.5 rounded border border-[var(--border)]">
                    {cluster.decisions?.map((dec: any) => (
                      <div key={dec.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--text)]">{dec.title}</span>
                          <Link
                            href={`/meetings/${dec.meetingId}`}
                            className="text-[var(--teal)] hover:underline font-mono text-[10px] flex items-center gap-1"
                          >
                            <span>{dec.meeting?.title || "Meeting"}</span>
                            <ArrowRight size={10} />
                          </Link>
                        </div>
                        <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                          {dec.context}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-2">
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--text)] flex items-center gap-2">
          <BookOpen className="text-[var(--primary)] w-5 h-5" /> Knowledge Engine
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-0.5">
          Query organizational decision memory with natural language vector search and semantic AI synthesis.
        </p>
      </div>

      <Suspense fallback={<div className="text-xs text-[var(--text-faint)] font-mono">Loading Search Index...</div>}>
        <KnowledgeSearchContent />
      </Suspense>
    </div>
  );
}
