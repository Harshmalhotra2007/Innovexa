/**
 * AI Domain Validator & Runtime Type Guards
 * Runtime validation functions, sanitization helpers, and TypeScript type guards.
 */

import { z, ZodError, ZodSchema } from "zod";
import {
  MeetingSegment,
  ActionItem,
  DecisionRecord,
  TopicCluster,
  ExecutiveSummary,
  ContradictionSignal,
  CitationReference,
} from "../../types/ai-domain";
import {
  MeetingSegmentSchema,
  ActionItemSchema,
  DecisionRecordSchema,
  TopicClusterSchema,
  ExecutiveSummarySchema,
  ContradictionSignalSchema,
  CitationReferenceSchema,
} from "../schemas/ai-domain-schema";

export interface ValidationResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  statusCode: number;
}

// ─── Input Sanitization Helpers ──────────────────────────────────────────────

/**
 * Strips script tags, HTML tags, null bytes, and malicious prompt escape delimiters.
 */
export function sanitizeAIInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replace(/\0/g, "") // Remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove <script>...</script>
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/```(?:system|assistant|user)?/gi, "'''") // Neutralize markdown prompt injections
    .trim();
}

/**
 * Recursively sanitizes string properties in any payload object.
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeAIInput(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }

  return obj;
}

// ─── Generic Safe Validation Helper ──────────────────────────────────────────

export function validateSchema<T>(
  schema: ZodSchema<T>,
  payload: unknown,
  sanitize: boolean = true
): ValidationResponse<T> {
  const candidate = sanitize ? sanitizeObject(payload) : payload;
  const result = schema.safeParse(candidate);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      statusCode: 200,
    };
  }

  const issues = result.error?.issues || (result.error as any)?.errors || [];
  const errorMessages = issues.map(
    (e: any) => `${e.path?.join(".") || "root"}: ${e.message}`
  );

  return {
    success: false,
    errors: errorMessages.length > 0 ? errorMessages : [result.error?.message || "Validation failed"],
    statusCode: 422,
  };
}

// ─── Domain-Specific Parsers ─────────────────────────────────────────────────

export function validateMeetingSegment(payload: unknown): ValidationResponse<MeetingSegment> {
  return validateSchema(MeetingSegmentSchema, payload);
}

export function validateActionItem(payload: unknown): ValidationResponse<ActionItem> {
  return validateSchema(ActionItemSchema, payload);
}

export function validateDecisionRecord(payload: unknown): ValidationResponse<DecisionRecord> {
  return validateSchema(DecisionRecordSchema, payload);
}

export function validateTopicCluster(payload: unknown): ValidationResponse<TopicCluster> {
  return validateSchema(TopicClusterSchema, payload);
}

export function validateExecutiveSummary(payload: unknown): ValidationResponse<ExecutiveSummary> {
  return validateSchema(ExecutiveSummarySchema, payload);
}

export function validateContradictionSignal(payload: unknown): ValidationResponse<ContradictionSignal> {
  return validateSchema(ContradictionSignalSchema, payload);
}

export function validateCitationReference(payload: unknown): ValidationResponse<CitationReference> {
  return validateSchema(CitationReferenceSchema, payload);
}

// ─── TypeScript Runtime Type Guards ──────────────────────────────────────────

export function isMeetingSegment(candidate: unknown): candidate is MeetingSegment {
  return MeetingSegmentSchema.safeParse(candidate).success;
}

export function isActionItem(candidate: unknown): candidate is ActionItem {
  return ActionItemSchema.safeParse(candidate).success;
}

export function isDecisionRecord(candidate: unknown): candidate is DecisionRecord {
  return DecisionRecordSchema.safeParse(candidate).success;
}

export function isTopicCluster(candidate: unknown): candidate is TopicCluster {
  return TopicClusterSchema.safeParse(candidate).success;
}

export function isExecutiveSummary(candidate: unknown): candidate is ExecutiveSummary {
  return ExecutiveSummarySchema.safeParse(candidate).success;
}

export function isContradictionSignal(candidate: unknown): candidate is ContradictionSignal {
  return ContradictionSignalSchema.safeParse(candidate).success;
}

export function isCitationReference(candidate: unknown): candidate is CitationReference {
  return CitationReferenceSchema.safeParse(candidate).success;
}
