"use client";

import React, { useState } from "react";
import Link from "next/link";
import ApiExplorer from "@/components/docs/ApiExplorer";
import ArchitectureDiagrams from "@/components/docs/ArchitectureDiagrams";
import TestCoverageMatrix from "@/components/docs/TestCoverageMatrix";
import {
  FileCode,
  Layers,
  Cpu,
  Shield,
  Download,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Terminal,
  ArrowLeft,
} from "lucide-react";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"explorer" | "architecture" | "tests" | "openapi">("explorer");

  const downloadOpenApiJson = () => {
    window.open("/api/docs/openapi", "_blank");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)] pb-24">
      {/* Top Header */}
      <div className="border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  href="/tasks"
                  className="flex items-center gap-1 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--primary)] transition-colors mr-2"
                >
                  <ArrowLeft size={13} /> Return to Console
                </Link>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                  OpenAPI 3.1.0 Hub
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Sync Validated
                </span>
              </div>
              <h1 className="text-2xl font-bold uppercase tracking-wide font-display text-[var(--text)]">
                Innovexa Developer & Architecture Hub
              </h1>
              <p className="text-xs text-[var(--text-dim)] font-mono">
                Interactive OpenAPI reference, real-time testing sandbox, live system topology, and test specification suite.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadOpenApiJson}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text)] hover:text-[var(--primary)] hover:border-[var(--primary)]/40 transition-all shadow-xs"
              >
                <Download size={13} /> Export OpenAPI JSON
              </button>
              <a
                href="/API.md"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-mono font-bold hover:bg-[var(--primary)]/90 transition-all shadow-xs"
              >
                <BookOpen size={13} /> View API.md <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-dim)] uppercase">Endpoints</span>
              <p className="text-base font-bold text-[var(--text)] mt-0.5">62 Operations</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-dim)] uppercase">Documentation Drift</span>
              <p className="text-base font-bold text-emerald-400 mt-0.5">0.0% (Zero Drift)</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-dim)] uppercase">Security Gate</span>
              <p className="text-base font-bold text-emerald-400 mt-0.5">RBAC & CRON_SECRET</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-dim)] uppercase">OpenAPI Standard</span>
              <p className="text-base font-bold text-[var(--teal)] mt-0.5">v3.1.0 Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab("explorer")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === "explorer"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "bg-[var(--panel)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
            }`}
          >
            <FileCode size={14} /> Interactive API Explorer
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === "architecture"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "bg-[var(--panel)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
            }`}
          >
            <Layers size={14} /> System Architecture Visualizer
          </button>
          <button
            onClick={() => setActiveTab("tests")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === "tests"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "bg-[var(--panel)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
            }`}
          >
            <Shield size={14} /> Test Specification Matrix
          </button>
          <button
            onClick={() => setActiveTab("openapi")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === "openapi"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "bg-[var(--panel)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
            }`}
          >
            <Terminal size={14} /> CLI & Automation Commands
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "explorer" && <ApiExplorer />}
        {activeTab === "architecture" && <ArchitectureDiagrams />}
        {activeTab === "tests" && <TestCoverageMatrix />}
        {activeTab === "openapi" && (
          <div className="p-6 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xs space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-base font-bold uppercase text-[var(--text)] flex items-center gap-2">
                <Terminal size={18} className="text-[var(--primary)]" /> CLI & CI/CD Documentation Tools
              </h3>
              <p className="text-xs text-[var(--text-dim)] font-sans mt-1">
                Automated commands to generate OpenAPI specs, validate documentation drift, and run quality passes.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--primary)]">1. Generate & Export OpenAPI 3.1.0 Specification</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)]">Build Step</span>
                </div>
                <pre className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--teal)] overflow-x-auto">
                  npm run docs:generate
                </pre>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Exports <code>public/openapi.json</code> containing full schemas, headers, query parameters, and operation descriptors.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">2. CI/CD Documentation Drift & Schema Sync Verification</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)]">CI Gate</span>
                </div>
                <pre className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-emerald-400 overflow-x-auto">
                  npm run docs:verify
                </pre>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Compares disk route handlers in <code>src/app/api/</code> against the OpenAPI specification and Prisma models. Fails CI with exit code 1 if any endpoints or methods are undocumented.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
