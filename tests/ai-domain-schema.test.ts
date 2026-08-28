import {
  MeetingSegmentSchema,
  ActionItemSchema,
  DecisionRecordSchema,
  TopicClusterSchema,
  ExecutiveSummarySchema,
  ContradictionSignalSchema,
  CitationReferenceSchema,
} from "../src/lib/schemas/ai-domain-schema";

describe("AI Domain Schemas - Functional Pass", () => {
  it("should validate and parse a complete MeetingSegment", () => {
    const validSegment = {
      id: "seg-101",
      meetingId: "meet-202",
      speakerId: "speaker-1",
      speakerName: "Alice Smith",
      text: "We have finalized the migration timeline for the Postgres cluster.",
      startTime: 12.5,
      endTime: 18.2,
      confidence: 0.98,
      sentiment: "POSITIVE",
      isKeyTakeaway: true,
    };

    const parsed = MeetingSegmentSchema.parse(validSegment);
    expect(parsed.id).toBe("seg-101");
    expect(parsed.sentiment).toBe("POSITIVE");
    expect(parsed.isKeyTakeaway).toBe(true);
  });

  it("should enforce endTime >= startTime refinement on MeetingSegment", () => {
    const invalidSegment = {
      id: "seg-102",
      meetingId: "meet-202",
      speakerName: "Bob Jones",
      text: "Testing inverted timestamps.",
      startTime: 25.0,
      endTime: 20.0, // Invalid: endTime < startTime
    };

    expect(() => MeetingSegmentSchema.parse(invalidSegment)).toThrow(
      "End time must be greater than or equal to start time"
    );
  });

  it("should validate and apply defaults to ActionItem", () => {
    const rawActionItem = {
      id: "act-001",
      meetingId: "meet-202",
      title: "Deploy LiveKit Egress worker",
      assigneeEmail: "dev@innovexa.com",
    };

    const parsed = ActionItemSchema.parse(rawActionItem);
    expect(parsed.priority).toBe("MEDIUM");
    expect(parsed.status).toBe("PENDING");
    expect(parsed.confidenceScore).toBe(0.85);
  });

  it("should reject ActionItem with invalid email or empty title", () => {
    expect(() =>
      ActionItemSchema.parse({
        id: "act-002",
        meetingId: "meet-202",
        title: "OK", // too short (min 3)
        assigneeEmail: "not-an-email",
      })
    ).toThrow();
  });

  it("should validate DecisionRecord with valid status", () => {
    const decision = {
      id: "dec-10",
      meetingId: "meet-202",
      title: "Adopt Next.js 14 App Router for all frontend services",
      rationale: "Improves SSR performance and standardizes team conventions.",
      status: "APPROVED",
    };

    const parsed = DecisionRecordSchema.parse(decision);
    expect(parsed.status).toBe("APPROVED");
    expect(parsed.timestamp).toBeDefined();
  });

  it("should validate TopicCluster and enforce keyword array constraints", () => {
    const topic = {
      id: "top-1",
      meetingId: "meet-202",
      name: "Database Scaling",
      summary: "Discussion regarding connection pooling and read replicas.",
      keywords: ["postgres", "scaling", "neon", "replicas"],
      durationSeconds: 420,
    };

    const parsed = TopicClusterSchema.parse(topic);
    expect(parsed.keywords.length).toBe(4);
    expect(parsed.relevanceScore).toBe(0.9);
  });

  it("should validate ExecutiveSummary with structured sentiment overview", () => {
    const summary = {
      meetingId: "meet-202",
      overview: "Engineering all-hands sync reviewing Q3 architecture milestones.",
      keyOutcomes: ["Approved migration plan", "Resolved audio latency bugs"],
      blockersAndRisks: ["Third-party API rate limits"],
      nextSteps: ["Ship Egress container", "Audit security"],
      sentimentOverview: {
        positiveRatio: 0.7,
        neutralRatio: 0.2,
        negativeRatio: 0.1,
        overallSentiment: "POSITIVE",
      },
    };

    const parsed = ExecutiveSummarySchema.parse(summary);
    expect(parsed.sentimentOverview.overallSentiment).toBe("POSITIVE");
    expect(parsed.keyOutcomes.length).toBe(2);
  });
});
