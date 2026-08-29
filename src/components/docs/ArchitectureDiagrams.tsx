"use client";

import React, { useState } from "react";
import { Cpu, Radio, Shield, Zap, Database, ArrowRight, Layers, CheckCircle2 } from "lucide-react";

export default function ArchitectureDiagrams() {
  const [activeTab, setActiveTab] = useState<"webrtc" | "bot" | "sla" | "rag">("webrtc");

  return (
    <div className="space-y-4 font-sans text-[var(--text)]">
      {/* Subsystem Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--panel)] border border-[var(--border)] font-mono text-xs">
        <button
          onClick={() => setActiveTab("webrtc")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            activeTab === "webrtc"
              ? "bg-[var(--primary)] text-white shadow-xs"
              : "text-[var(--text-dim)] hover:text-[var(--text)]"
          }`}
        >
          <Radio size={13} /> 1. LiveKit & Whisper Pipeline
        </button>
        <button
          onClick={() => setActiveTab("bot")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            activeTab === "bot"
              ? "bg-[var(--primary)] text-white shadow-xs"
              : "text-[var(--text-dim)] hover:text-[var(--text)]"
          }`}
        >
          <Cpu size={13} /> 2. AI Bot & SSE Protocol
        </button>
        <button
          onClick={() => setActiveTab("sla")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            activeTab === "sla"
              ? "bg-[var(--primary)] text-white shadow-xs"
              : "text-[var(--text-dim)] hover:text-[var(--text)]"
          }`}
        >
          <Zap size={13} /> 3. Two-Tier SLA Engine
        </button>
        <button
          onClick={() => setActiveTab("rag")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            activeTab === "rag"
              ? "bg-[var(--primary)] text-white shadow-xs"
              : "text-[var(--text-dim)] hover:text-[var(--text)]"
          }`}
        >
          <Database size={13} /> 4. RAG Semantic Search
        </button>
      </div>

      {/* Subsystem Diagram Cards */}
      <div className="p-6 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xs space-y-6">
        {activeTab === "webrtc" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold uppercase font-display tracking-wide flex items-center gap-2 text-[var(--primary)]">
                <Radio size={18} /> LiveKit WebRTC Egress & Whisper ASR Architecture
              </h3>
              <p className="text-xs text-[var(--text-dim)] font-mono mt-1">
                Real-time WebM cluster slice demuxing, EBML header retention, and prompt-primed Whisper speech recognition.
              </p>
            </div>

            {/* Architecture Node Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">1</div>
                <h4 className="font-bold text-[var(--text)]">Client Capture</h4>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Browser <code>getUserMedia</code> at 16kHz mono audio slice with automatic gain & noise suppression.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">2</div>
                <h4 className="font-bold text-[var(--text)]">EBML Demuxer</h4>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  <code>useWhisperPipeline</code> caches initial chunk header and prepends to all subsequent WebM slices.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">3</div>
                <h4 className="font-bold text-[var(--text)]">Whisper ASR</h4>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Direct Groq / Local Whisper API calls with explicit English prompt hints to eliminate hallucinations.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">4</div>
                <h4 className="font-bold text-[var(--text)]">Live Segment Store</h4>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Persists speaker segments into PostgreSQL and broadcasts via Server-Sent Events to live participants.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bot" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold uppercase font-display tracking-wide flex items-center gap-2 text-[var(--teal)]">
                <Cpu size={18} /> Autonomous AI Meeting Bot & SSE Protocol
              </h3>
              <p className="text-xs text-[var(--text-dim)] font-mono mt-1">
                Stateful Puppeteer bot lifecycle with real-time SSE updates and in-meeting LLM action item extraction.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] font-mono text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] font-bold text-[var(--text-dim)]">
                <span>STAGE</span>
                <span>EVENT / ACTION</span>
                <span>STATE TRANSITION</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-400">1. Dispatch</span>
                <span>POST /api/ai-agent/join (Organizer role)</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">joining</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-400">2. Record</span>
                <span>Puppeteer joins Google Meet / LiveKit room</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">recording</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-400">3. Transcribe</span>
                <span>Audio stream decoded & segmented</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400">transcribing</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400">4. Ready</span>
                <span>LLM extracts tasks, decisions, and executive summary</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">completed</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sla" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold uppercase font-display tracking-wide flex items-center gap-2 text-rose-400">
                <Zap size={18} /> Dual-Tier SLA Escalation & Alert Loop
              </h3>
              <p className="text-xs text-[var(--text-dim)] font-mono mt-1">
                Automated 24h SLA compliance monitoring, management escalation, and Resend email alerting loop.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold uppercase">Tier 1: Pre-Deadline</span>
                <h4 className="font-bold text-[var(--text)]">Deadline Approaching (&lt; 24h)</h4>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Automated warning notification sent to task assignee reminding them of upcoming deadline.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/30 space-y-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-bold uppercase">Tier 2: Overdue</span>
                <h4 className="font-bold text-[var(--text)]">Target Resolution Missed</h4>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Task status shifts to <code>Overdue</code>. Alert logged in notifications and flagged on SLA board.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/30 space-y-2">
                <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 font-bold uppercase">Tier 3: Escalation</span>
                <h4 className="font-bold text-[var(--text)]">Overdue &gt; 24h Management Escalation</h4>
                <p className="text-[11px] text-[var(--text-dim)] font-sans">
                  Status shifts to <code>Escalated</code>. Automated email dispatched to department manager via Resend.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "rag" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold uppercase font-display tracking-wide flex items-center gap-2 text-purple-400">
                <Database size={18} /> Semantic Search & RAG Knowledge Synthesis
              </h3>
              <p className="text-xs text-[var(--text-dim)] font-mono mt-1">
                Vector cosine similarity indexing, topic clustering, and hallucination-free citations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] font-mono text-xs space-y-3">
              <div className="flex items-center gap-2 text-[var(--text)] font-bold">
                <span>Transcript Segments</span>
                <ArrowRight size={14} className="text-[var(--primary)]" />
                <span>OpenAI / Local Embeddings</span>
                <ArrowRight size={14} className="text-[var(--primary)]" />
                <span>Cosine Ranking</span>
                <ArrowRight size={14} className="text-[var(--primary)]" />
                <span>RAG Synthesis with Timestamp Citations</span>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] font-sans">
                Every AI synthesized response links directly back to the exact speaker and timestamp in the original recording for full auditable provenance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
