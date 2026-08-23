"use client";

import React, { useState, useEffect } from "react";
import { GitCommit, Filter, Search } from "lucide-react";
import Link from "next/link";

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("All");

  useEffect(() => {
    async function loadDecisions() {
      try {
        // Fetch all meetings to extract their decisions (since we don't have a direct /api/decisions route, or we can use the meetings route)
        // Wait, the meetings route returns decisions included.
        const res = await fetch("/api/meetings");
        const data = await res.json();
        const allDecisions = data.flatMap((m: any) => 
          (m.decisions || []).map((d: any) => ({
            ...d,
            meetingTitle: m.title,
            meetingDate: m.date
          }))
        );
        allDecisions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDecisions(allDecisions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDecisions();
  }, []);

  const departments = ["All", "Engineering", "Design", "Marketing", "Sales", "Product", "Operations & Logistics", "Cybersecurity & Governance"];
  const filtered = decisions.filter(d => deptFilter === "All" || d.department === deptFilter);

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">Decision History & Audit Trail</h1>
        <p className="text-xs text-[#8FA0A4] mt-1">
          A chronological timeline of all formal decisions made across the organization.
        </p>
      </div>

      <div className="flex items-center gap-3 bg-[#1a1a2f] p-4 rounded-md border border-[#2d2345]">
        <Filter size={14} className="text-[#8FA0A4]" />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="ops-input text-xs py-1.5 px-3 rounded-md w-48"
        >
          {departments.map(d => (
            <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-xs text-[#5B6A6E] py-10">Loading decision history...</div>
      ) : (
        <div className="relative border-l border-[#2d2345] ml-3 pl-6 space-y-8">
          {filtered.length === 0 && (
            <div className="text-xs text-[#5B6A6E]">No decisions logged yet.</div>
          )}
          {filtered.map((dec) => (
            <div key={dec.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-[#9f55ff] bg-[#1a1a2f]"></div>
              
              <div className="ops-panel p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-[#E7EEEF]">{dec.title}</h3>
                    <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-[#5B6A6E]">
                      <span className="text-[#00ffff]">{new Date(dec.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-[#9f55ff]">{dec.department}</span>
                    </div>
                  </div>
                  <Link href={`/meetings/${dec.meetingId}`} className="text-[#8FA0A4] hover:text-[#E7EEEF] border border-[#3e305e] rounded px-2 py-1 text-[10px] font-mono flex items-center gap-1">
                    <GitCommit size={10} /> View Context
                  </Link>
                </div>
                
                <div className="bg-[#1a1a2f] p-3 rounded border border-[#2d2345] mt-3">
                  <div className="text-xs text-[#8FA0A4]">
                    <span className="text-[#5B6A6E] font-mono">Context: </span> {dec.context}
                  </div>
                  {dec.rationale && (
                    <div className="text-xs text-[#8FA0A4] mt-2">
                      <span className="text-[#5B6A6E] font-mono">Rationale: </span> {dec.rationale}
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

