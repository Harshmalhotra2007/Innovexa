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
} from "lucide-react";

function KnowledgeSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [department, setDepartment] = useState("All");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const presets = [
    "ChromaDB vs Qdrant vector database",
    "JWT token refresh and security RBAC",
    "48 hour SLA manager escalation policy",
    "Pydantic JSON schema validation",
  ];

  useEffect(() => {
    if (query) {
      runSearch(query, department);
    } else {
      runSearch("vendor contract renewal caching bug", "All");
    }
  }, [department]);

  async function runSearch(qText: string, deptText: string) {
    if (!qText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(qText)}&department=${encodeURIComponent(deptText)}`);
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
    runSearch(query, department);
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <div className="ops-panel p-6 space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8FA0A4]" />
            <input
              type="text"
              placeholder="e.g. 'What vendor contract quote did we decide to accept?'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ops-input w-full pl-10 pr-28 py-2.5 text-xs font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[#E8A33D] px-3 py-1 text-xs font-semibold text-[#1A1305] hover:bg-[#d8932d]"
            >
              {loading ? "Searching..." : "Vector Search"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[#5B6A6E]">Sample Queries:</span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setQuery(p);
                  runSearch(p, department);
                }}
                className="rounded border border-[#2A363A] bg-[#141C1F] px-2 py-0.5 font-mono text-[11px] text-[#8FA0A4] hover:text-[#E7EEEF]"
              >
                🔍 {p}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-[#E7EEEF] flex items-center gap-2">
          <Database size={15} className="text-[#49B9AE]" />
          <span>Semantic Memory Matches ({results.length})</span>
        </h2>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.map((res, idx) => (
          <div key={res.id || idx} className="ops-panel p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="ops-badge border-[#2A363A] text-[#E8A33D]">{res.type}</span>
                <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">{res.department}</span>
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
                <span>Origin Meeting: {res.meetingTitle || "Record"}</span>
                <Link href={`/meetings/${res.meetingId}`} className="text-[#E8A33D] hover:underline flex items-center gap-1">
                  <span>Trace Context</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
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
