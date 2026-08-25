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

  const presets = [
    "Adopt Dual Vector Storage",
    "ChromaDB vs Qdrant vector database",
    "48 hour SLA manager escalation policy",
    "Pydantic JSON schema validation",
  ];

  useEffect(() => {
    // Run search if query changed or filter modified
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        runSearch(query, department, startDate, endDate);
      } else {
        runSearch("caching bug", department, startDate, endDate);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, department, startDate, endDate]);

  useEffect(() => {
    // Load Topic Clusters and Contradictions
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
    try {
      let url = `/api/search?q=${encodeURIComponent(qText)}&department=${encodeURIComponent(deptText)}`;
      if (start) url += `&startDate=${encodeURIComponent(start)}`;
      if (end) url += `&endDate=${encodeURIComponent(end)}`;

      const res = await fetch(url);
      const data = await res.json();
      setResults(data);
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

  return (
    <div className="space-y-6">
      {/* Contradiction Alerts Section */}
      {contradictions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E2666A]">
            <AlertTriangle size={15} />
            <span>⚠️ REAL-TIME DECISION CONTRADICTION ALERTS ({contradictions.length})</span>
          </div>
          <div className="space-y-2">
            {contradictions.map((contra) => (
              <div 
                key={contra.id} 
                className="bg-[#2E1C1D] border border-[#E2666A]/40 rounded-lg p-4 space-y-2 text-xs leading-relaxed"
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-[#E2666A]">
                  <span>CONTRADICTION IDENTIFIED</span>
                  <span>Confidence: {Math.round(contra.confidence * 100)}%</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#141C1F] p-2.5 rounded border border-[#2A363A]">
                    <div className="font-semibold text-[#E8A33D] mb-1">
                      New Decision: {contra.decision1.title}
                    </div>
                    <p className="text-[#8FA0A4]">{contra.decision1.context}</p>
                    <div className="mt-1 text-[10px] text-[#5B6A6E] font-mono">
                      Meeting: {contra.decision1.meeting?.title}
                    </div>
                  </div>
                  <div className="bg-[#141C1F] p-2.5 rounded border border-[#2A363A]">
                    <div className="font-semibold text-[#49B9AE] mb-1">
                      Conflicting Decision: {contra.decision2.title}
                    </div>
                    <p className="text-[#8FA0A4]">{contra.decision2.context}</p>
                    <div className="mt-1 text-[10px] text-[#5B6A6E] font-mono">
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
      <div className="flex gap-2 border-b border-[#212B2E] pb-px">
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "search" 
              ? "border-[#E8A33D] text-[#E8A33D]" 
              : "border-transparent text-[#8FA0A4] hover:text-[#E7EEEF]"
          }`}
        >
          Semantic search
        </button>
        <button
          onClick={() => setActiveTab("clusters")}
          className={`px-4 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "clusters" 
              ? "border-[#E8A33D] text-[#E8A33D]" 
              : "border-transparent text-[#8FA0A4] hover:text-[#E7EEEF]"
          }`}
        >
          Topic clusters
        </button>
      </div>

      {activeTab === "search" ? (
        <div className="space-y-6">
          {/* Search Inputs Card */}
          <div className="ops-panel p-6 space-y-4">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8FA0A4]" />
                <input
                  type="text"
                  placeholder="Query meeting memory: e.g. 'adoption of ChromaDB or database decisions'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="ops-input w-full pl-10 pr-28 py-2.5 text-xs font-mono"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[#E8A33D] px-3 py-1.5 text-xs font-semibold text-[#1A1305] hover:bg-[#d8932d]"
                >
                  {loading ? "Searching..." : "Vector Search"}
                </button>
              </div>

              {/* Filters Block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="font-mono text-[10px] uppercase text-[#5B6A6E] block mb-1">
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
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-[#5B6A6E] block mb-1">
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
                  <label className="font-mono text-[10px] uppercase text-[#5B6A6E] block mb-1">
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

              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="text-[#5B6A6E]">Sample Queries:</span>
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setQuery(p);
                      runSearch(p, department, startDate, endDate);
                    }}
                    className="rounded border border-[#2A363A] bg-[#141C1F] px-2 py-1 font-mono text-[11px] text-[#8FA0A4] hover:text-[#E7EEEF]"
                  >
                    🔍 {p}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Results Area */}
          <div className="space-y-3">
            <h2 className="font-display text-sm font-bold text-[#E7EEEF] flex items-center gap-2 uppercase tracking-wide">
              <Database size={14} className="text-[#49B9AE]" />
              <span>Semantic Memory Matches ({results.length})</span>
            </h2>

            {results.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#5B6A6E] bg-[#141C1F] rounded-lg border border-[#212B2E]">
                No semantic matches found for this query. Try adjusting your query or filters.
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((res, idx) => (
                  <div key={res.id || idx} className="ops-panel p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="ops-badge border-[#2A363A] bg-[#141C1F] text-[#E8A33D]">
                          {res.type}
                        </span>
                        <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">
                          {res.department}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#49B9AE]">
                        Similarity: {Math.round(res.score * 100)}%
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-[#E7EEEF]">{res.title}</div>
                      <p className="text-xs text-[#8FA0A4] mt-1 bg-[#141C1F] p-2.5 rounded border border-[#212B2E] leading-relaxed">
                        {res.content}
                      </p>
                    </div>

                    {res.meetingId && (
                      <div className="flex items-center justify-between pt-2 border-t border-[#212B2E] text-[11px] font-mono text-[#5B6A6E]">
                        <span>Origin Meeting: {res.meetingTitle || "Record"} ({res.date})</span>
                        <Link href={`/meetings/${res.meetingId}`} className="text-[#E8A33D] hover:underline flex items-center gap-1">
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
            <h2 className="font-display text-sm font-bold text-[#E7EEEF] flex items-center gap-2 uppercase tracking-wide">
              <FolderOpen size={14} className="text-[#49B9AE]" />
              <span>HDBSCAN Generative Clusters ({clusters.length})</span>
            </h2>
            <button 
              onClick={() => setRefreshTrigger(t => t + 1)}
              className="text-[10px] font-mono border border-[#2A363A] bg-[#141C1F] px-2.5 py-1 text-[#8FA0A4] hover:text-[#E7EEEF] rounded"
            >
              REFRESH PIPELINE
            </button>
          </div>

          {clusters.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#5B6A6E] bg-[#141C1F] rounded-lg border border-[#212B2E]">
              No topic clusters found. Topic clusters generate automatically after multiple meetings are indexed.
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="ops-panel p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#212B2E] pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#E8A33D]">
                        CLUSTER: {cluster.id.toUpperCase()}
                      </span>
                      {cluster.keywords.map((kw: string) => (
                        <span key={kw} className="ops-badge border-[#2A363A] bg-[#141C1F] text-[#49B9AE] text-[10px]">
                          #{kw}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-[#5B6A6E]">
                      {cluster.decisions?.length || 0} decisions linked
                    </span>
                  </div>
                  
                  <div className="divide-y divide-[#212B2E]">
                    {cluster.decisions?.map((dec: any) => (
                      <div key={dec.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#E7EEEF]">{dec.title}</span>
                          <Link 
                            href={`/meetings/${dec.meetingId}`}
                            className="text-[#49B9AE] hover:underline font-mono text-[10px] flex items-center gap-1"
                          >
                            <span>{dec.meeting?.title || "Meeting"}</span>
                            <ArrowRight size={10} />
                          </Link>
                        </div>
                        <p className="text-xs text-[#8FA0A4] leading-relaxed">
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
        <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">Knowledge Engine</h1>
        <p className="text-xs text-[#8FA0A4] mt-1">
          Query past organizational decisions and meeting memory with natural language vector search.
        </p>
      </div>

      <Suspense fallback={<div className="text-xs text-[#5B6A6E]">Loading Search Index...</div>}>
        <KnowledgeSearchContent />
      </Suspense>
    </div>
  );
}
