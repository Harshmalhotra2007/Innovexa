"use client";

import React, { useState } from "react";
import { API_ENDPOINTS, OpenApiEndpoint } from "@/lib/docs/openapi-spec";
import {
  Search,
  Code2,
  Play,
  Copy,
  Check,
  Lock,
  Globe,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  Layers,
  Filter,
} from "lucide-react";

const METHOD_COLORS = {
  get: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  post: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  patch: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  delete: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  put: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function ApiExplorer() {
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [userRole, setUserRole] = useState<"organizer" | "participant">("organizer");

  // Interactive Execution State
  const [executing, setExecuting] = useState<boolean>(false);
  const [responseOutput, setResponseOutput] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    data: any;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const tags = Array.from(new Set(API_ENDPOINTS.flatMap((e) => e.tags)));

  const filteredEndpoints = API_ENDPOINTS.filter((ep) => {
    const matchesTag = selectedTag === "all" || ep.tags.includes(selectedTag);
    const matchesSearch =
      !searchQuery ||
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const handleTestRequest = async (endpoint: OpenApiEndpoint) => {
    setExecuting(true);
    setResponseOutput(null);
    const start = Date.now();

    try {
      // Replace path parameters with sample values
      let url = endpoint.path.replace("{id}", "cm0a1b2c3d4e5f6g7h8i9j0k").replace("{meetingId}", "cm0a1b2c3d4e5f6g7h8i9j0k");

      const headers: Record<string, string> = {
        "x-user-role": userRole,
      };

      let body: string | undefined;
      if (endpoint.method !== "get") {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          title: "Sample Automated Request",
          department: "Engineering",
        });
      }

      const res = await fetch(url, {
        method: endpoint.method.toUpperCase(),
        headers,
        body,
      });

      const durationMs = Date.now() - start;
      let data: any;
      try {
        data = await res.json();
      } catch {
        data = { message: await res.text() };
      }

      setResponseOutput({
        status: res.status,
        statusText: res.statusText,
        durationMs,
        data,
      });
    } catch (err: any) {
      setResponseOutput({
        status: 500,
        statusText: "Network Error",
        durationMs: Date.now() - start,
        data: { error: err.message || "Failed to dispatch test request" },
      });
    } finally {
      setExecuting(false);
    }
  };

  const copyCurl = (ep: OpenApiEndpoint) => {
    const url = `http://localhost:3000${ep.path}`;
    const cmd = `curl -X ${ep.method.toUpperCase()} "${url}" \\\n  -H "x-user-role: ${userRole}" \\\n  -H "Content-Type: application/json"`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="text"
            placeholder="Filter by route path or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)] font-mono"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setSelectedTag("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              selectedTag === "all"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "bg-[var(--panel-alt)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
            }`}
          >
            All ({API_ENDPOINTS.length})
          </button>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedTag === t
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "bg-[var(--panel-alt)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Role Toggle for Sandbox */}
        <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)]">
          <Shield size={12} className="text-[var(--primary)]" />
          <span className="text-[var(--text-dim)]">Role:</span>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as any)}
            className="bg-transparent font-bold text-[var(--primary)] focus:outline-none cursor-pointer"
          >
            <option value="organizer">organizer (admin)</option>
            <option value="participant">participant (read-only)</option>
          </select>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-2.5">
        {filteredEndpoints.map((ep, idx) => {
          const isExpanded = expandedIndex === idx;
          const methodClass = METHOD_COLORS[ep.method] || METHOD_COLORS.get;
          const hasAuth = !!ep.security && ep.security.length > 0;

          return (
            <div
              key={`${ep.method}-${ep.path}-${idx}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden shadow-xs transition-all hover:border-[var(--primary)]/40"
            >
              {/* Header Bar */}
              <div
                onClick={() => {
                  setExpandedIndex(isExpanded ? null : idx);
                  setResponseOutput(null);
                }}
                className="flex items-center justify-between p-3.5 cursor-pointer bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold uppercase border ${methodClass}`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--text)]">{ep.path}</span>
                  <span className="text-xs text-[var(--text-dim)] hidden sm:inline">• {ep.summary}</span>
                </div>

                <div className="flex items-center gap-2">
                  {hasAuth && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                      <Lock size={10} /> RBAC Protected
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--panel)] border border-[var(--border)] text-[var(--text-dim)]">
                    {ep.tags[0]}
                  </span>
                  {isExpanded ? <ChevronDown size={16} className="text-[var(--text-dim)]" /> : <ChevronRight size={16} className="text-[var(--text-dim)]" />}
                </div>
              </div>

              {/* Expanded Details & Live Runner */}
              {isExpanded && (
                <div className="p-4 border-t border-[var(--border)] space-y-4 text-xs font-mono">
                  <p className="text-xs text-[var(--text-dim)] font-sans">{ep.description}</p>

                  {/* Parameters */}
                  {ep.parameters && ep.parameters.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">Parameters</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ep.parameters.map((p) => (
                          <div key={p.name} className="p-2 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] flex items-center justify-between">
                            <span className="font-bold text-[var(--text)]">{p.name}</span>
                            <span className="text-[10px] text-[var(--text-dim)]">{p.in} • {p.schema?.type || "string"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleTestRequest(ep)}
                      disabled={executing}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold font-mono hover:bg-[var(--primary)]/90 transition-all shadow-xs disabled:opacity-50"
                    >
                      <Play size={12} className={executing ? "animate-spin" : ""} />
                      <span>{executing ? "Dispatching..." : "Try It Out (Live)"}</span>
                    </button>

                    <button
                      onClick={() => copyCurl(ep)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-all font-mono"
                    >
                      {copied ? <Check size={12} className="text-[var(--teal)]" /> : <Copy size={12} />}
                      <span>{copied ? "Copied curl" : "Copy curl"}</span>
                    </button>
                  </div>

                  {/* Live Response Box */}
                  {responseOutput && (
                    <div className="p-3.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              responseOutput.status >= 200 && responseOutput.status < 300
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            Status: {responseOutput.status} {responseOutput.statusText}
                          </span>
                        </div>
                        <span className="text-[var(--text-dim)] flex items-center gap-1">
                          <Clock size={11} /> {responseOutput.durationMs}ms
                        </span>
                      </div>

                      <pre className="text-[11px] text-[var(--text)] overflow-x-auto p-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] leading-relaxed max-h-64">
                        {JSON.stringify(responseOutput.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
