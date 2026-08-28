/**
 * AI Domain Zod Schemas
 * Comprehensive runtime validation rules for all AI-generated outputs,
 * inputs, speech transcriptions, and meeting summaries.
 */

import { z } from "zod";

export const SentimentEnum = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]);
export const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const TaskLifecycleStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "ESCALATED"]);
export const DecisionStatusEnum = z.enum(["PROPOSED", "APPROVED", "REJECTED", "IMPLEMENTED"]);
export const AIAgentLifecycleStateEnum = z.enum([
  "IDLE",
  "CONNECTING",
  "JOINED",
  "TRANSCRIBING",
  "PROCESSING",
  "DISCONNECTED",
  "ERROR",
]);

export const SpeakerHintSchema = z.object({
  speakerId: z.string().min(1, "Speaker ID is required").max(64),
  name: z.string().min(1, "Speaker name is required").max(100),
  role: z.string().max(100).optional(),
  confidence: z.number().min(0).max(1).default(1),
});

export const MeetingSegmentSchema = z.object({
  id: z.string().min(1, "Segment ID is required").max(100),
  meetingId: z.string().min(1, "Meeting ID is required").max(100),
  speakerId: z.string().min(1).max(64).default("speaker-0"),
  speakerName: z.string().min(1, "Speaker name cannot be empty").max(100),
  text: z.string().min(1, "Segment text cannot be empty").max(10000),
  startTime: z.number().min(0, "Start time must be non-negative"),
  endTime: z.number().min(0, "End time must be non-negative"),
  confidence: z.number().min(0).max(1).default(0.95),
  sentiment: SentimentEnum.optional().default("NEUTRAL"),
  isKeyTakeaway: z.boolean().optional().default(false),
}).refine((data) => data.endTime >= data.startTime, {
  message: "End time must be greater than or equal to start time",
  path: ["endTime"],
});

export const ActionItemSchema = z.object({
  id: z.string().min(1).max(100),
  meetingId: z.string().min(1).max(100),
  title: z.string().min(3, "Title must be at least 3 characters").max(300),
  description: z.string().max(2000).optional(),
  assigneeName: z.string().max(100).optional(),
  assigneeEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  dueDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  priority: TaskPriorityEnum.default("MEDIUM"),
  status: TaskLifecycleStatusEnum.default("PENDING"),
  extractedFromSegmentId: z.string().max(100).optional(),
  confidenceScore: z.number().min(0).max(1).default(0.85),
});

export const DecisionRecordSchema = z.object({
  id: z.string().min(1).max(100),
  meetingId: z.string().min(1).max(100),
  title: z.string().min(3, "Decision title must be at least 3 characters").max(300),
  rationale: z.string().min(5, "Rationale must be at least 5 characters").max(3000),
  impactArea: z.string().max(150).optional(),
  decidedBy: z.string().max(100).optional(),
  timestamp: z.string().default(() => new Date().toISOString()),
  status: DecisionStatusEnum.default("APPROVED"),
});

export const TopicClusterSchema = z.object({
  id: z.string().min(1).max(100),
  meetingId: z.string().min(1).max(100),
  name: z.string().min(2, "Topic cluster name is required").max(150),
  summary: z.string().min(5, "Cluster summary must be provided").max(2000),
  keywords: z.array(z.string().min(1).max(50)).min(1, "At least one keyword required").max(30),
  durationSeconds: z.number().min(0).default(0),
  segmentIds: z.array(z.string()).default([]),
  relevanceScore: z.number().min(0).max(1).default(0.9),
});

export const ExecutiveSummarySchema = z.object({
  meetingId: z.string().min(1).max(100),
  overview: z.string().min(10, "Overview summary is too short").max(5000),
  keyOutcomes: z.array(z.string().min(2).max(500)).default([]),
  blockersAndRisks: z.array(z.string().min(2).max(500)).default([]),
  nextSteps: z.array(z.string().min(2).max(500)).default([]),
  sentimentOverview: z.object({
    positiveRatio: z.number().min(0).max(1).default(0.5),
    neutralRatio: z.number().min(0).max(1).default(0.3),
    negativeRatio: z.number().min(0).max(1).default(0.2),
    overallSentiment: SentimentEnum.default("NEUTRAL"),
  }),
  generatedAt: z.string().default(() => new Date().toISOString()),
});

export const ContradictionSignalSchema = z.object({
  id: z.string().min(1).max(100),
  meetingId: z.string().min(1).max(100),
  statementA: z.string().min(3).max(1000),
  statementB: z.string().min(3).max(1000),
  segmentAId: z.string().min(1).max(100),
  segmentBId: z.string().min(1).max(100),
  speakerA: z.string().min(1).max(100),
  speakerB: z.string().min(1).max(100),
  explanation: z.string().min(5).max(2000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export const CitationReferenceSchema = z.object({
  id: z.string().min(1).max(100),
  meetingId: z.string().min(1).max(100),
  sourceText: z.string().min(2).max(2000),
  segmentId: z.string().min(1).max(100),
  timestamp: z.number().min(0),
  speakerName: z.string().min(1).max(100),
  claimVerified: z.boolean().default(true),
});
