"use client";

import { useState } from "react";
import { useAIAgent } from "@/hooks/useAIAgent";
import { AudioPlayer } from "./AudioPlayer";
import {
  Bot,
  Mic,
  MicOff,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CircleCheck,
  Loader2,
  Square,
  Radio,
  RadioTower,
  Cpu,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  ListChecks,
  FileText,
  Settings2,
  Play,
  Zap,
  User,
  Activity,
  WifiOff,
  Signal,
} from "lucide-react";

interface AIAgentPanelProps {
  meetingId: string;
  meetingTitle?: string;
}

// ── Status config ───────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; ring: string; pulse: boolean }> = {
  idle:        { label: "STANDBY",      color: "text-[var(--text-dim)]",  ring: "border-[var(--border)]",            pulse: false },
  joining:     { label: "DISPATCHING",  color: "text-[var(--amber)]",     ring: "border-[var(--amber)]",             pulse: true  },
  recording:   { label: "RECORDING",   color: "text-[var(--red)]",       ring: "border-[var(--red)]",               pulse: true  },
  transcribing:{ label: "TRANSCRIBING",color: "text-[var(--primary)]",   ring: "border-[var(--primary)]",           pulse: true  },
  summarizing: { label: "ANALYZING",   color: "text-[var(--teal)]",      ring: "border-[var(--teal)]",              pulse: true  },
  completed:   { label: "COMPLETE",    color: "text-[var(--teal)]",      ring: "border-[var(--teal)]",              pulse: false },
};

function priorityClass(p?: string) {
  return p === "High"
    ? "bg-[var(--red)]/12 text-[var(--red)] border-[var(--red)]/30"
    : p === "Low"
    ? "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30"
    : "bg-[var(--amber)]/12 text-[var(--amber)] border-[var(--amber)]/30";
}

// ── Pipeline steps ──────────────────────────────────────────
const PIPELINE = [
  { status: "joining",     label: "Dispatch",    icon: Cpu },
  { status: "recording",   label: "Record",      icon: Radio },
  { status: "transcribing",label: "Transcribe",  icon: FileText },
  { status: "summarizing", label: "Analyze",     icon: Sparkles },
  { status: "completed",   label: "Ready",       icon: CircleCheck },
];

const PIPELINE_ORDER = ["joining","recording","transcribing","summarizing","completed"];

// ── Main component ──────────────────────────────────────────
export default function AIAgentPanel({ meetingId, meetingTitle }: AIAgentPanelProps) {
  const {
    agent, actionItems, highlightedChunkIndex, setHighlightedChunkIndex,
    loading, errorMsg, userRole, customMeetUrl, setCustomMeetUrl,
    audioQuality, setAudioQuality, isTabRecording, tabRecordSeconds,
    handleManagedBotJoin, handleEndMeeting, startTabAudioCapture, stopTabAudioCapture,
    fetchStatus, fetchActionItems,
  } = useAIAgent(meetingId);

  const [activeTab, setActiveTab] = useState<"transcript" | "tasks" | "summary" | "settings">("transcript");
  const [showSettings, setShowSettings] = useState(false);
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "Pending" | "In Progress" | "Completed" | "Overdue" | "Escalated">("all");

  const status = agent.status;
  const meta  = STATUS_META[status] ?? STATUS_META.idle;
  const pipelineIdx = PIPELINE_ORDER.indexOf(status);

  const parseTs = (ts: string) => {
    const parts = ts.replace(/[\[\]]/g, "").split(":");
    return parts.length === 2 ? +parts[0] * 60 + +parts[1] : 0;
  };

  const isActive   = ["joining","recording","transcribing","summarizing"].includes(status);
  const isRecording = status === "recording" || isTabRecording;
  const taskCount  = actionItems.length;
  const filteredTasks = taskFilter === "all" ? actionItems : actionItems.filter(t => (t.status ?? "Pending") === taskFilter);

  const formatTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  const updateItemStatus = async (taskId?: string, newStatus?: string) => {
    if (!taskId || !newStatus) return;
    try {
      await fetch(`/api/tasks/${taskId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchActionItems();
    } catch (e) {
      console.warn("[AIAgentPanel Status Update Note]", e);
    }
  };

  const TABS = [
    { key: "transcript", label: "Transcript", icon: FileText,   count: agent.transcript?.length ?? 0 },
    { key: "tasks",      label: "AI Tasks",   icon: ListChecks, count: taskCount },
    { key: "summary",    label: "Summary",    icon: Sparkles,   count: null },
    { key: "settings",   label: "Settings",   icon: Settings2,  count: null },
  ] as const;

  return (
    <div className="space-y-4 text-[var(--text)] font-sans">

      {/* ══════════════════════════════════════════════════
          CARD 1 — Command Center Header
      ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm overflow-hidden">

        {/* Top bar — Status + Meeting ID + Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">

          {/* Left: Avatar + identity */}
          <div className="flex items-center gap-3">
            {/* Animated status ring */}
            <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl border-2 bg-[var(--panel-alt)] transition-all ${meta.ring}`}>
              <Bot className={`w-5 h-5 transition-colors ${meta.color}`} />
              {meta.pulse && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecording ? "bg-red-400" : "bg-blue-400"}`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isRecording ? "bg-red-500" : "bg-blue-500"}`} />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-wider text-[var(--text)] uppercase">
                  AI Meeting Engine
                </span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                  status === "completed" ? "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30"
                  : isActive ? "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/30 animate-pulse"
                  : "bg-[var(--panel-alt)] text-[var(--text-dim)] border-[var(--border)]"
                }`}>
                  {meta.label}
                </span>
              </div>
              <p className="font-mono text-[11px] text-[var(--text-dim)] mt-0.5">
                ID: <span className="text-[var(--primary)] font-bold">{meetingId.slice(0, 8)}…</span>
                {meetingTitle && <span className="ml-2 opacity-60">· {meetingTitle.slice(0, 32)}{meetingTitle.length > 32 ? "…" : ""}</span>}
              </p>
            </div>
          </div>

          {/* Right: recording timer + end button */}
          <div className="flex items-center gap-2">
            {isTabRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/30 font-mono text-xs text-[var(--red)] font-bold">
                <span className="w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
                {formatTimer(tabRecordSeconds)}
              </div>
            )}
            {(isActive || isTabRecording) && (
              <button
                onClick={handleEndMeeting}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase bg-[var(--red)] text-white hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                End Session
              </button>
            )}
            {!isActive && !isTabRecording && (
              <button
                onClick={() => { fetchStatus(); fetchActionItems(); }}
                className="p-2 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors"
                title="Refresh status"
              >
                <Activity size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Pipeline progress strip */}
        <div className="px-5 py-3 bg-[var(--panel-alt)] border-b border-[var(--border)]">
          <div className="flex items-center gap-0">
            {PIPELINE.map((step, idx) => {
              const isDone    = pipelineIdx > idx;
              const isCurrent = pipelineIdx === idx;
              const Icon = step.icon;
              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center gap-1 flex-1 ${idx === 0 ? "" : ""}`}>
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all ${
                      isCurrent ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                      : isDone  ? "border-[var(--teal)] bg-[var(--teal)]/15 text-[var(--teal)]"
                      : "border-[var(--border)] bg-[var(--panel)] text-[var(--text-faint)]"
                    }`}>
                      <Icon size={12} className={isCurrent ? "animate-pulse" : ""} />
                    </div>
                    <span className={`font-mono text-[9px] uppercase font-bold ${
                      isCurrent ? "text-[var(--primary)]"
                      : isDone  ? "text-[var(--teal)]"
                      : "text-[var(--text-faint)]"
                    }`}>{step.label}</span>
                  </div>
                  {idx < PIPELINE.length - 1 && (
                    <div className={`h-0.5 w-full mx-1 rounded-full transition-all ${isDone ? "bg-[var(--teal)]" : "bg-[var(--border)]"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio Player (only when recording exists) */}
        {agent.recordingUrl && (
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-dim)] uppercase mb-2">
              <Signal size={11} className="text-[var(--teal)]" /> Audio Recording
            </div>
            <AudioPlayer src={agent.recordingUrl} seekTime={seekTimestamp} isRecording={isRecording} />
          </div>
        )}

        {/* Quick actions strip */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-2">
          {/* Dispatch AI bot */}
          <button
            onClick={handleManagedBotJoin}
            disabled={(isActive && !isTabRecording) || loading || userRole !== "organizer"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-mono font-bold hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
            {status === "completed" ? "Restart AI Agent" : "Dispatch AI Agent"}
          </button>

          {/* Local recording */}
          {isTabRecording ? (
            <button
              onClick={stopTabAudioCapture}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--red)]/15 border border-[var(--red)]/40 text-[var(--red)] text-xs font-mono font-bold hover:bg-[var(--red)]/25 transition-all animate-pulse"
            >
              <Square size={13} className="fill-current" /> Stop Recording · {formatTimer(tabRecordSeconds)}
            </button>
          ) : (
            <button
              onClick={startTabAudioCapture}
              disabled={isActive && !isTabRecording}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal)]/10 text-[var(--teal)] text-xs font-mono font-bold hover:bg-[var(--teal)]/20 disabled:opacity-40 transition-all"
            >
              <Mic size={13} /> Local Recording
            </button>
          )}

          {userRole !== "organizer" && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-faint)] ml-1">
              <WifiOff size={11} /> Organizer role required
            </span>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CARD 2 — Intelligence Tabs
      ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-mono font-bold uppercase whitespace-nowrap border-b-2 transition-all ${
                  active
                    ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)]"
                }`}
              >
                <Icon size={13} />
                {tab.label}
                {tab.count !== null && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--panel-alt)] text-[var(--text-dim)]"
                  }`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB: Transcript ── */}
        {activeTab === "transcript" && (
          <div className="p-4">
            {agent.transcript && agent.transcript.length > 0 ? (
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {agent.transcript.map((seg, i) => (
                  <button
                    key={i}
                    onClick={() => { setHighlightedChunkIndex(i); setSeekTimestamp(parseTs(seg.timestamp)); }}
                    className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition-all group ${
                      highlightedChunkIndex === i
                        ? "bg-[var(--primary)]/12 border border-[var(--primary)]/30"
                        : "hover:bg-[var(--panel-alt)] border border-transparent"
                    }`}
                  >
                    {/* Timestamp pill */}
                    <span className="shrink-0 mt-0.5 font-mono text-[10px] text-[var(--text-faint)] group-hover:text-[var(--primary)] transition-colors w-14 text-right">
                      {seg.timestamp}
                    </span>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <span className="block font-mono text-[10px] font-bold text-[var(--primary)]">{seg.speaker}</span>
                      <p className="text-xs text-[var(--text)] leading-relaxed">{seg.text}</p>
                    </div>
                    {agent.recordingUrl && (
                      <Play size={11} className="shrink-0 mt-1 text-[var(--text-faint)] group-hover:text-[var(--primary)] transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] flex items-center justify-center">
                  <MicOff size={22} className="text-[var(--text-faint)]" />
                </div>
                <p className="font-mono text-xs text-[var(--text-dim)]">No transcript captured yet.</p>
                <p className="font-mono text-[10px] text-[var(--text-faint)]">
                  Dispatch the AI Agent or start a Local Recording to begin live captions.
                </p>
                <button
                  onClick={startTabAudioCapture}
                  disabled={isActive}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--teal)]/15 border border-[var(--teal)]/40 text-[var(--teal)] text-xs font-mono font-bold hover:bg-[var(--teal)]/25 disabled:opacity-40 transition-all"
                >
                  <Mic size={13} /> Start Local Recording
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: AI Tasks ── */}
        {activeTab === "tasks" && (
          <div className="p-4 space-y-4">
            {/* Header with stats and filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--amber)]/12 border border-[var(--amber)]/30 flex items-center justify-center">
                  <ListChecks size={16} className="text-[var(--amber)]" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-[var(--text)]">AI Action Items</p>
                  <p className="font-mono text-[10px] text-[var(--text-dim)]">
                    {taskCount} item{taskCount !== 1 ? "s" : ""} •
                    {actionItems.filter(t => (t.status ?? "") === "Completed").length} completed •
                    {Math.round(taskCount > 0 ? (actionItems.filter(t => (t.status ?? "") === "Completed").length / taskCount) * 100 : 0)}% done
                  </p>
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {(["all", "Pending", "In Progress", "Completed", "Overdue", "Escalated"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTaskFilter(f as any)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase border transition-all ${
                      taskFilter === f
                        ? "bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]"
                        : "bg-[var(--panel-alt)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--primary)]/30"
                    }`}
                  >
                    {f === "all" ? `All (${taskCount})` : `${f} (${actionItems.filter(t => (t.status ?? "Pending") === f).length})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                {/* Empty state with illustration */}
                <div className="w-16 h-16 mx-auto rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] flex items-center justify-center">
                  {taskCount === 0 ? (
                    <ListChecks size={24} className="text-[var(--text-faint)]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--text-faint)] flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-[var(--text-faint)]" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-xs font-bold text-[var(--text)]">
                    {taskCount === 0 ? "No action items yet" : `No "${taskFilter}" tasks`}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--text-faint)]">
                    {taskCount === 0
                      ? "Dispatch the AI Agent on a meeting transcript to auto-extract action items."
                      : `All action items are in other statuses. Try "All" filter.`}
                  </p>
                </div>
                {taskCount === 0 && (
                  <button
                    onClick={() => { setActiveTab("transcript"); fetchStatus(); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/40 text-[var(--primary)] text-xs font-mono font-bold hover:bg-[var(--primary)]/25 transition-all"
                  >
                    <FileText size={13} /> View Transcript
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {/* Mini Kanban Board */}
                {(["Pending", "In Progress", "Completed", "Overdue", "Escalated"] as const).map(statusKey => {
                  const colTasks = filteredTasks.filter(t => (t.status ?? "Pending") === statusKey);
                  const isOverdue = statusKey === "Overdue";
                  const isEscalated = statusKey === "Escalated";

                  const statusMeta = {
                    "Pending": { color: "text-[var(--amber)]", bg: "bg-[var(--amber)]/10 border-[var(--amber)]/30", icon: Clock },
                    "In Progress": { color: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10 border-[var(--primary)]/30", icon: Activity },
                    "Completed": { color: "text-[var(--teal)]", bg: "bg-[var(--teal)]/10 border-[var(--teal)]/30", icon: CircleCheck },
                    "Overdue": { color: "text-[var(--red)]", bg: "bg-[var(--red)]/10 border-[var(--red)]/30", icon: AlertTriangle },
                    "Escalated": { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", icon: Zap },
                  }[statusKey];

                  const StatusIcon = statusMeta.icon;

                  return (
                    <div key={statusKey} className="space-y-2">
                      {/* Column Header */}
                      <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${statusMeta.bg}`}>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon size={12} className={statusMeta.color} />
                          <span className={`font-mono text-xs font-bold uppercase ${statusMeta.color}`}>{statusKey}</span>
                        </div>
                        <span className={`text-sm font-bold font-display ${statusMeta.color}`}>{colTasks.length}</span>
                      </div>

                      {/* Cards */}
                      <div className="space-y-2 min-h-[40px]">
                        {colTasks.length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="font-mono text-[9px] text-[var(--text-faint)] italic">Drop tasks here</p>
                          </div>
                        ) :
                          colTasks.map((item, idx) => {
                            const taskStatus = item.status ?? "Pending";
                            const isDone = taskStatus === "Completed";
                            const d = item.deadline ? Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86400000) : null;
                            const isUrgent = d !== null && d < 0 && !isDone;

                            return (
                              <div
                                key={item.id ?? idx}
                                className={`rounded-lg border p-3 space-y-2 transition-all hover:shadow-md ${
                                  isDone
                                    ? "border-[var(--border)] bg-[var(--panel-alt)] opacity-70"
                                    : isUrgent
                                    ? "border-[var(--red)]/50 bg-[var(--red)]/5 shadow-sm animate-pulse"
                                    : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--primary)]/40 shadow-sm"
                                }`}
                              >
                                {/* Top row: Title + check */}
                                <div className="flex items-start gap-2.5">
                                  <button
                                    onClick={() => updateItemStatus(item.id, isDone ? "Pending" : "Completed")}
                                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isDone
                                        ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                                        : "border-[var(--border)] bg-transparent text-transparent hover:border-[var(--teal)] hover:bg-[var(--teal)]/10"
                                    }`}
                                    title={isDone ? "Mark pending" : "Mark complete"}
                                  >
                                    {isDone && <CircleCheck size={10} />}
                                  </button>
                                  <p className={`text-xs font-semibold leading-relaxed flex-1 min-w-0 ${isDone ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"}`}>
                                    {item.title ?? item.task ?? "Untitled action item"}
                                  </p>
                                </div>

                                {/* Badges & Status Selector row */}
                                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
                                  {(item.ownerName ?? item.assignee) && (
                                    <span className="flex items-center gap-1 text-[var(--text-dim)] bg-[var(--panel-alt)] px-2 py-0.5 rounded border border-[var(--border)]">
                                      <User size={8} /> {item.ownerName ?? item.assignee}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded border font-bold uppercase ${priorityClass(item.priority)}`}>
                                    {item.priority ?? "Medium"}
                                  </span>

                                  {/* Quick Status Dropdown */}
                                  <select
                                    value={taskStatus}
                                    onChange={(e) => updateItemStatus(item.id, e.target.value)}
                                    className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold uppercase cursor-pointer ${
                                      taskStatus === "Completed"  ? "bg-[var(--teal)]/12 text-[var(--teal)] border-[var(--teal)]/30"
                                      : taskStatus === "Overdue"  ? "bg-[var(--red)]/12 text-[var(--red)] border-[var(--red)]/30"
                                      : taskStatus === "In Progress" ? "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/30"
                                      : taskStatus === "Escalated" ? "bg-orange-500/12 text-orange-500 border-orange-500/30"
                                      : "bg-[var(--amber)]/12 text-[var(--amber)] border-[var(--amber)]/30"
                                    }`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Overdue">Overdue</option>
                                    <option value="Escalated">Escalated</option>
                                  </select>

                                  {item.deadline && (
                                    <span className={`flex items-center gap-0.5 font-bold ${
                                      isUrgent ? "text-[var(--red)]" : isDone ? "text-[var(--text-faint)]" : d !== null && d <= 2 ? "text-[var(--amber)]" : "text-[var(--teal)]"
                                    }`}>
                                      <Clock size={8} />
                                      {isDone ? "Done" : isUrgent ? `Overdue ${Math.abs(d!)}d` : d === 0 ? "Today" : `${d}d`}
                                    </span>
                                  )}
                                </div>

                                {/* Description if present */}
                                {item.description && (
                                  <p className="text-[10px] text-[var(--text-dim)] leading-relaxed font-sans border-l border-[var(--border)] pl-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Summary ── */}
        {activeTab === "summary" && (
          <div className="p-5">
            {agent.summary ? (
              <div className="space-y-4">
                {/* Summary header */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--amber)]/15 border border-[var(--amber)]/30 flex items-center justify-center">
                    <Sparkles size={15} className="text-[var(--amber)]" />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-bold text-[var(--text)] uppercase tracking-wider">AI Executive Summary</p>
                    <p className="font-mono text-[10px] text-[var(--text-dim)]">Generated by Innovexa AI Engine</p>
                  </div>
                </div>

                {/* Summary body */}
                <div className="rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] p-4">
                  <p className="text-sm text-[var(--text)] leading-relaxed">{agent.summary}</p>
                </div>

                {/* Joined at */}
                {agent.joinedAt && (
                  <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-dim)]">
                    <Clock size={11} /> Joined: {new Date(agent.joinedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-[var(--panel-alt)] border border-[var(--border)] flex items-center justify-center">
                  <Sparkles size={22} className="text-[var(--text-faint)]" />
                </div>
                <p className="font-mono text-xs text-[var(--text-dim)]">AI Summary not yet generated.</p>
                <p className="font-mono text-[10px] text-[var(--text-faint)]">
                  The AI Engine will automatically synthesize a summary after the recording is transcribed.
                </p>
                {status === "idle" && (
                  <button
                    onClick={handleManagedBotJoin}
                    disabled={loading || userRole !== "organizer"}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/40 text-[var(--primary)] text-xs font-mono font-bold hover:bg-[var(--primary)]/25 disabled:opacity-40 transition-all"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                    Dispatch AI Agent
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Settings ── */}
        {activeTab === "settings" && (
          <div className="p-5 space-y-5">

            {/* Meeting URL override */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase font-bold text-[var(--text-dim)] block">
                Custom Meeting URL Override
              </label>
              <input
                type="text"
                placeholder="https://meet.google.com/xxx-xxxx-xxx (optional)"
                value={customMeetUrl}
                onChange={(e) => setCustomMeetUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
              <p className="font-mono text-[10px] text-[var(--text-faint)]">Leave blank to use the meeting's stored URL.</p>
            </div>

            {/* Audio quality */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase font-bold text-[var(--text-dim)] flex items-center gap-1.5">
                <RadioTower size={11} /> Local Recording Audio Quality
              </label>
              <div className="flex gap-2">
                {(["high","medium","low"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setAudioQuality(q)}
                    className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold uppercase border transition-all ${
                      audioQuality === q
                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                        : "bg-[var(--panel-alt)] text-[var(--text-dim)] border-[var(--border)] hover:text-[var(--text)]"
                    }`}
                  >
                    {q === "high" ? "High · 128k" : q === "medium" ? "Med · 64k" : "Low · 32k"}
                  </button>
                ))}
              </div>
            </div>

            {/* Local recording */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase font-bold text-[var(--text-dim)] flex items-center gap-1.5">
                <Radio size={11} className="text-[var(--teal)]" /> Local Audio Recording
              </label>
              {isTabRecording ? (
                <button
                  onClick={stopTabAudioCapture}
                  className="w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold bg-[var(--red)] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 animate-pulse"
                >
                  <Square size={13} className="fill-current" />
                  Stop Recording · {formatTimer(tabRecordSeconds)}
                </button>
              ) : (
                <button
                  onClick={startTabAudioCapture}
                  disabled={isActive}
                  className="w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  <Mic size={13} /> Start Local Recording
                </button>
              )}
              <p className="font-mono text-[10px] text-[var(--text-faint)]">
                Captures system/microphone audio and streams live captions via browser Speech API.
              </p>
            </div>

            {/* Role badge */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
              <Users size={13} className="text-[var(--text-dim)]" />
              <span className="font-mono text-[10px] text-[var(--text-dim)]">
                Current role:
              </span>
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                userRole === "organizer"
                  ? "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/30"
                  : "bg-[var(--panel-alt)] text-[var(--text-dim)] border-[var(--border)]"
              }`}>
                {userRole}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="rounded-xl bg-[var(--red)]/10 border border-[var(--red)]/40 px-4 py-3 flex items-start gap-3 font-mono text-xs text-[var(--red)]">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* Active session banner */}
      {isRecording && (
        <div className="rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/40 px-4 py-3 flex items-center gap-3 font-mono text-xs text-[var(--amber)]">
          <Users size={14} className="shrink-0" />
          <span>
            <strong>MEETING ACTIVE —</strong> The AI Agent is recording. Participants can join the live room using the meeting link above.
          </span>
        </div>
      )}
    </div>
  );
}
