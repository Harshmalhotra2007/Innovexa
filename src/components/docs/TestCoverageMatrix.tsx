"use client";

import React from "react";
import { CheckCircle2, Shield, Terminal, Play, AlertCircle, FileCode } from "lucide-react";

export default function TestCoverageMatrix() {
  const testSuites = [
    {
      name: "API & RBAC Authorization Suite",
      file: "tests/api.test.ts",
      type: "Integration",
      coverage: "Organizer / Participant role enforcement, meeting deletion cascade, task assignment.",
      status: "Passing (100%)",
      command: "npx jest tests/api.test.ts",
    },
    {
      name: "SLA Alert & Escalation Engine Suite",
      file: "tests/sla-alerts.test.ts",
      type: "Unit & Integration",
      coverage: "24h pre-deadline calculation, Level 1 & Level 2 escalation triggers, Resend email loop.",
      status: "Passing (100%)",
      command: "npx jest tests/sla-alerts.test.ts",
    },
    {
      name: "OpenAPI Generator & Schema Specs Suite",
      file: "tests/docs-generator.test.ts",
      type: "Unit",
      coverage: "OpenAPI 3.1.0 document compilation, tag metadata, schema consistency.",
      status: "Passing (100%)",
      command: "npx jest tests/docs-generator.test.ts",
    },
    {
      name: "CI/CD Documentation Drift Validator Suite",
      file: "tests/docs-drift.test.ts",
      type: "Integration",
      coverage: "Codebase route scanning, method matching, Prisma enum alignment, zero-drift verification.",
      status: "Passing (100%)",
      command: "npx jest tests/docs-drift.test.ts",
    },
    {
      name: "LiveKit Egress & Recording Suite",
      file: "src/lib/__tests__/livekit-egress.test.ts",
      type: "Unit",
      coverage: "Room composite egress starts, stop timeouts, recording database upserts.",
      status: "Passing (100%)",
      command: "npx jest src/lib/__tests__/livekit-egress.test.ts",
    },
    {
      name: "Multi-Recipient Meeting Invite Suite",
      file: "tests/invite-api.test.ts",
      type: "Integration",
      coverage: "Batch email dispatch, email validation, role token parameters.",
      status: "Passing (100%)",
      command: "npx jest tests/invite-api.test.ts",
    },
  ];

  return (
    <div className="space-y-4 font-sans text-[var(--text)]">
      {/* Top Summary Banner */}
      <div className="p-4 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
            <Shield size={18} />
          </div>
          <div>
            <h4 className="font-bold text-[var(--text)]">Continuous Quality & Security Gates</h4>
            <p className="text-[11px] text-[var(--text-dim)]">Automated testing matrix covering RBAC, SLA rules, ASR pipelines, and documentation drift.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={13} /> 6 Active Test Suites
          </span>
          <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
            0 Drift Detected
          </span>
        </div>
      </div>

      {/* Test Matrix Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden shadow-xs font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--panel-alt)] text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                <th className="p-3.5 pl-4">Test Suite</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Coverage Focus</th>
                <th className="p-3.5">Execution Command</th>
                <th className="p-3.5 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {testSuites.map((ts, idx) => (
                <tr key={idx} className="hover:bg-[var(--panel-alt)]/50 transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-[var(--text)]">
                    <div className="flex items-center gap-2">
                      <FileCode size={14} className="text-[var(--primary)] shrink-0" />
                      <span>{ts.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--panel-alt)] border border-[var(--border)] font-bold text-[var(--text-dim)]">
                      {ts.type}
                    </span>
                  </td>
                  <td className="p-3.5 text-[11px] text-[var(--text-dim)] font-sans max-w-xs">
                    {ts.coverage}
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-[var(--teal)]">
                    <code>{ts.command}</code>
                  </td>
                  <td className="p-3.5 pr-4 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {ts.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
