/**
 * AI Domain Type Definitions
 * Strict contracts for transcripts, insights, action items, decisions, and bot telemetry.
 */

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskLifecycleStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "ESCALATED";
export type AIAgentLifecycleState = "IDLE" | "CONNECTING" | "JOINED" | "TRANSCRIBING" | "PROCESSING" | "DISCONNECTED" | "ERROR";

export interface SpeakerHint {
  speakerId: string;
  name: string;
  role?: string;
  confidence: number;
}

export interface MeetingSegment {
  id: string;
  meetingId: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  sentiment?: Sentiment;
  isKeyTakeaway?: boolean;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskLifecycleStatus;
  extractedFromSegmentId?: string;
  confidenceScore: number;
}

export interface DecisionRecord {
  id: string;
  meetingId: string;
  title: string;
  rationale: string;
  impactArea?: string;
  decidedBy?: string;
  timestamp: string;
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "IMPLEMENTED";
}

export interface TopicCluster {
  id: string;
  meetingId: string;
  name: string;
  summary: string;
  keywords: string[];
  durationSeconds: number;
  segmentIds: string[];
  relevanceScore: number;
}

export interface ExecutiveSummary {
  meetingId: string;
  overview: string;
  keyOutcomes: string[];
  blockersAndRisks: string[];
  nextSteps: string[];
  sentimentOverview: {
    positiveRatio: number;
    neutralRatio: number;
    negativeRatio: number;
    overallSentiment: Sentiment;
  };
  generatedAt: string;
}

export interface ContradictionSignal {
  id: string;
  meetingId: string;
  statementA: string;
  statementB: string;
  segmentAId: string;
  segmentBId: string;
  speakerA: string;
  speakerB: string;
  explanation: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface CitationReference {
  id: string;
  meetingId: string;
  sourceText: string;
  segmentId: string;
  timestamp: number;
  speakerName: string;
  claimVerified: boolean;
}
