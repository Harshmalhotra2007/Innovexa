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
  Cpu,
  Layers,
  Check,
} from "lucide-react";

export interface KnowledgeSearchResult {
  id: string;
  type: string;
  department: string;
  title: string;
  content: string;
  score?: number;
  date?: string;
  meetingTitle?: string;
  meetingId?: string;
  tags?: string[];
  ownerName?: string;
  status?: string;
}

export interface TopicClusterItem {
  id: string;
  keywords?: string[];
  decisions?: Array<{
    id: string;
    title: string;
  }>;
}

export interface ContradictionItem {
  id: string;
  confidence: number;
  decision1?: {
    title: string;
    context: string;
    meeting?: {
      title: string;
    } | null;
  } | null;
  decision2?: {
    title: string;
    context: string;
    meeting?: {
      title: string;
    } | null;
  } | null;
}

export interface QACitationItem {
  citationId: number;
  title: string;
  score: string;
  meetingId?: string;
  type?: string;
}

export interface QAResponse {
  answer: string;
  citations: QACitationItem[];
}

function KnowledgeSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [department, setDepartment] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "clusters" | "qa">("search");

  // Vector DB Health State
  const [vectorHealth, setVectorHealth] = useState<{
    status: string;
    provider: string;
    totalIndexedItems: number;
    embeddingDimensions: number;
    endpoint: string;
  }>({
    status: "STANDALONE_HYBRID",
    provider: "ChromaDB / Hybrid",
    totalIndexedItems: 48,
    embeddingDimensions: 384,
    endpoint: "in-process://vector-hybrid",
  });
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexSuccess, setIndexSuccess] = useState<string | null>(null);

  // Topic Clusters and Contradictions states
  const [clusters, setClusters] = useState<TopicClusterItem[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dismissedContradictions, setDismissedContradictions] = useState<Set<string>>(new Set());

  // AI QA State
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<QAResponse | null>(null);
  const [qaLoading, setQaLoading] = useState(false);

  const presets = [
    "Adopt Dual Vector Storage",
    "ChromaDB vs Qdrant vector database",
    "48 hour SLA manager escalation policy",
    "LiveKit Egress recording container",
  ];

  useEffect(() => {
    fetchVectorHealth();
  }, []);

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

  async function fetchVectorHealth() {
    try {
      const res = await fetch("/api/search/health");
      if (res.ok) {
        const data = await res.json();
        setVectorHealth(data);
      }
    } catch {
      // Keep default healthy state
    }
  }

  async function handleReindex() {
    try {
      setIsIndexing(true);
      setIndexSuccess(null);
      const res = await fetch("/api/search/index", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIndexSuccess(data.message || "Vector index synchronized successfully");
        fetchVectorHealth();
        setTimeout(() => setIndexSuccess(null), 4000);
      }
    } catch (err) {
      console.error("Reindex error:", err);
    } finally {
      setIsIndexing(false);
    }
  }

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

      if (data && data.length > 0) {
        const topMatch = data[0];
        setAiAnswer(
          `Based on semantic vector search for "${qText}":\n\n` +
            `• Primary Result (${topMatch.department}): "${topMatch.title}"\n` +
            `• Vector Similarity: ${Math.round((topMatch.score || 0.85) * 100)}% Match\n` +
            `• Grounded Content: ${topMatch.content}`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleQaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qaQuestion.trim()) return;
    setQaLoading(true);
    setQaAnswer(null);

    try {
      const res = await fetch("/api/search/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qaQuestion }),
      });
      if (res.ok) {
        const data = await res.json();
        setQaAnswer(data);
      }
    } catch (err) {
      console.error("QA error:", err);
    } finally {
      setQaLoading(false);
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
    <div className="space-y-6 font-sans text-[var(--text)]">
      {/* Vector Database Architecture Banner */}
      <div className="ops-panel p-4 border border-[var(--border)] bg-[var(--panel)] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
            <Database size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-[var(--text)] tracking-wide">
                VECTOR DATABASE & SEMANTIC RETRIEVAL ENGINE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30">
                {vectorHealth.status}
              </span>
            </div>
            <p className="text-xs text-[var(--text-dim)] font-mono mt-0.5">
              Provider: {vectorHealth.provider} • Dimensions: {vectorHealth.embeddingDimensions}d (Cosine) • Indexed Nodes: {vectorHealth.totalIndexedItems}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {indexSuccess && (
            <span className="text-xs font-mono text-[var(--teal)] flex items-center gap-1.5 animate-pulse">
              <Check size={14} /> {indexSuccess}
            </span>
          )}
          <button
            onClick={handleReindex}
            disabled={isIndexing}
            className="rounded border border-[var(--border)] bg-[var(--panel-alt)] hover:bg-[var(--panel)] px-3 py-1.5 text-xs font-mono font-bold text-[var(--text)] flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isIndexing ? "animate-spin" : ""} />
            <span>{isIndexing ? "Indexing..." : "SYNC VECTOR STORE"}</span>
          </button>
        </div>
      </div>

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
                      Decision A: {contra.decision1?.title}
                    </div>
                    <p className="text-[var(--text-dim)]">{contra.decision1?.context}</p>
                    <div className="mt-2 text-[10px] text-[var(--text-faint)] font-mono">
                      Meeting: {contra.decision1?.meeting?.title}
                    </div>
                  </div>
                  <div className="bg-[var(--panel-alt)] p-3 rounded border border-[var(--border)]">
                    <div className="font-semibold text-[var(--teal)] mb-1">
                      Conflicting Decision B: {contra.decision2?.title}
                    </div>
                    <p className="text-[var(--text-dim)]">{contra.decision2?.context}</p>
                    <div className="mt-2 text-[10px] text-[var(--text-faint)] font-mono">
                      Meeting: {contra.decision2?.meeting?.title}
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
            onClick={() => setActiveTab("qa")}
            className={`px-4 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "qa"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            <Sparkles size={14} /> Grounded AI Q&A
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

      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Search Inputs Card */}
          <div className="ops-panel p-5 space-y-4 border border-[var(--border)] bg-[var(--panel)]">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="relative">
                <Bot className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--primary)]" />
                <input
                  type="text"
                  placeholder="Ask Innovexa Semantic Search (e.g. 'What vector database decisions were made?')"
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
                  <span>{loading ? "Querying..." : "SEARCH"}</span>
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
                <Sparkles size={14} /> AI Semantic Memory Synthesis
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
              <span>Vector Similarity Matches ({results.length})</span>
            </h2>

            {results.length === 0 ? (
              <div className="text-center py-10 text-xs text-[var(--text-faint)] bg-[var(--panel-alt)] rounded-lg border border-[var(--border)] font-mono">
                No semantic matches found. Try adjusting your query or date filters.
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((res, idx) => {
                  const matchPercent = Math.round((res.score || 0.8) * 100);
                  return (
                    <div key={res.id || idx} className="ops-panel p-4 space-y-2.5 border border-[var(--border)] hover:border-[var(--primary)]/40 transition-colors bg-[var(--panel)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="ops-badge border-[var(--border)] bg-[var(--panel-alt)] text-[var(--primary)] uppercase font-mono text-[10px]">
                            {res.type}
                          </span>
                          <span className="ops-badge border-[var(--border)] text-[var(--text-dim)] text-[10px]">
                            {res.department}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[var(--teal)] h-full rounded-full"
                              style={{ width: `${matchPercent}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-[var(--teal)] font-semibold">
                            {matchPercent}% Match
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-[var(--text)]">{res.title}</div>
                        <p className="text-xs text-[var(--text-dim)] mt-1.5 bg-[var(--panel-alt)] p-3 rounded border border-[var(--border)] leading-relaxed font-sans">
                          {res.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[var(--text-faint)]">
                        <div className="flex items-center gap-3">
                          {res.date && <span>📅 {res.date}</span>}
                          {res.meetingTitle && (
                            <span>
                              Meeting: <strong className="text-[var(--text-dim)]">{res.meetingTitle}</strong>
                            </span>
                          )}
                        </div>
                        {res.meetingId && (
                          <Link
                            href={`/meetings/${res.meetingId}`}
                            className="text-[var(--primary)] hover:underline flex items-center gap-1 font-bold"
                          >
                            <span>Open Meeting</span>
                            <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grounded AI Q&A Tab */}
      {activeTab === "qa" && (
        <div className="space-y-6">
          <div className="ops-panel p-5 space-y-4 border border-[var(--border)] bg-[var(--panel)]">
            <h3 className="text-xs font-bold font-mono text-[var(--primary)] uppercase flex items-center gap-2">
              <Sparkles size={15} /> Knowledge Oracle (Grounded RAG Q&A)
            </h3>
            <form onSubmit={handleQaSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask any question across all recorded meetings and decisions..."
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  className="ops-input w-full pl-3 pr-28 py-2.5 text-xs font-mono text-[var(--text)]"
                />
                <button
                  type="submit"
                  disabled={qaLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold font-mono text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 shadow-md shadow-[var(--primary)]/20"
                >
                  <Zap size={12} />
                  <span>{qaLoading ? "Synthesizing..." : "ASK ORACLE"}</span>
                </button>
              </div>
            </form>
          </div>

          {qaAnswer && (
            <div className="space-y-4">
              <div className="ops-panel p-5 space-y-3 border border-[var(--primary)]/40 bg-[var(--panel-alt)]">
                <div className="font-mono text-xs font-bold text-[var(--primary)] uppercase flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[var(--teal)]" /> Grounded Synthesized Response
                </div>
                <div className="text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed bg-[var(--bg-raised)] p-4 rounded border border-[var(--border)]">
                  {qaAnswer.answer}
                </div>
              </div>

              {qaAnswer.citations && qaAnswer.citations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-[var(--text-dim)] uppercase font-bold">
                    Verifiable Grounding Citations ({qaAnswer.citations.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {qaAnswer.citations.map((c: QACitationItem) => (
                      <div
                        key={c.citationId}
                        className="ops-panel p-3 border border-[var(--border)] bg-[var(--panel)] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--teal)]">
                          <span>[Citation {c.citationId}]</span>
                          <span>{c.score} Match</span>
                        </div>
                        <div className="font-bold text-[var(--text)] truncate">{c.title}</div>
                        {c.meetingId && (
                          <Link
                            href={`/meetings/${c.meetingId}`}
                            className="text-[11px] text-[var(--primary)] hover:underline inline-block font-mono pt-1"
                          >
                            View Source Meeting →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Topic Clusters Tab */}
      {activeTab === "clusters" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster) => (
              <div
                key={cluster.id}
                className="ops-panel p-4 space-y-3 border border-[var(--border)] bg-[var(--panel)] flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--primary)] uppercase">
                      CLUSTER #{cluster.id.slice(0, 6)}
                    </span>
                    <span className="ops-badge text-[var(--teal)] border-[var(--teal)]/30 bg-[var(--teal)]/10 font-mono text-[10px]">
                      {cluster.decisions?.length || 0} DECISIONS
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.keywords?.map((kw: string) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 bg-[var(--panel-alt)] rounded text-[11px] font-mono text-[var(--text-dim)] border border-[var(--border)]"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)]">
                  <button
                    onClick={() => {
                      setQuery(cluster.keywords?.[0] || "");
                      setActiveTab("search");
                    }}
                    className="w-full text-center py-1.5 text-xs font-mono text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors font-bold"
                  >
                    SEARCH CLUSTER DECISIONS →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center font-mono text-xs text-[var(--text-dim)]">
          LOADING KNOWLEDGE REPOSITORY...
        </div>
      }
    >
      <KnowledgeSearchContent />
    </Suspense>
  );
}
