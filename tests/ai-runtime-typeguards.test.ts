import {
  isMeetingSegment,
  isActionItem,
  isDecisionRecord,
  isTopicCluster,
  isExecutiveSummary,
  isContradictionSignal,
  isCitationReference,
} from "../src/lib/validators/ai-domain-validator";

describe("AI Domain Runtime Type Guards - Unit Pass", () => {
  it("should return true for valid MeetingSegment and false for invalid", () => {
    const valid = {
      id: "seg-1",
      meetingId: "m-1",
      speakerName: "Engineer",
      text: "Testing type guard.",
      startTime: 0,
      endTime: 5,
    };
    const invalid = {
      id: "seg-1",
      text: "Missing meetingId and times",
    };

    expect(isMeetingSegment(valid)).toBe(true);
    expect(isMeetingSegment(invalid)).toBe(false);
    expect(isMeetingSegment(null)).toBe(false);
    expect(isMeetingSegment("string")).toBe(false);
  });

  it("should return true for valid ActionItem and false for invalid", () => {
    const valid = {
      id: "act-1",
      meetingId: "m-1",
      title: "Write documentation",
    };
    const invalid = {
      id: "act-1",
      title: "", // empty title violates min(3)
    };

    expect(isActionItem(valid)).toBe(true);
    expect(isActionItem(invalid)).toBe(false);
  });

  it("should return true for valid DecisionRecord and false for invalid", () => {
    const valid = {
      id: "dec-1",
      meetingId: "m-1",
      title: "Adopt Docker",
      rationale: "Ensures parity across dev and prod.",
    };
    const invalid = {
      id: "dec-1",
      title: "Adopt Docker",
      rationale: "", // too short
    };

    expect(isDecisionRecord(valid)).toBe(true);
    expect(isDecisionRecord(invalid)).toBe(false);
  });

  it("should return true for valid TopicCluster and false for invalid", () => {
    const valid = {
      id: "top-1",
      meetingId: "m-1",
      name: "Security",
      summary: "Security audit discussion",
      keywords: ["auth", "rbac"],
    };
    const invalid = {
      id: "top-1",
      meetingId: "m-1",
      name: "Security",
      summary: "Short",
      keywords: [], // empty keywords array
    };

    expect(isTopicCluster(valid)).toBe(true);
    expect(isTopicCluster(invalid)).toBe(false);
  });

  it("should return true for valid ExecutiveSummary and false for invalid", () => {
    const valid = {
      meetingId: "m-1",
      overview: "Comprehensive sprint recap covering all features.",
      keyOutcomes: ["Shipped v1"],
      blockersAndRisks: [],
      nextSteps: ["Ship v2"],
      sentimentOverview: {
        positiveRatio: 0.8,
        neutralRatio: 0.2,
        negativeRatio: 0.0,
        overallSentiment: "POSITIVE",
      },
    };
    const invalid = {
      meetingId: "m-1",
      overview: "Too short",
    };

    expect(isExecutiveSummary(valid)).toBe(true);
    expect(isExecutiveSummary(invalid)).toBe(false);
  });

  it("should return true for valid ContradictionSignal and false for invalid", () => {
    const valid = {
      id: "cnt-1",
      meetingId: "m-1",
      statementA: "We deploy on Friday.",
      statementB: "We never deploy on Friday.",
      segmentAId: "seg-1",
      segmentBId: "seg-2",
      speakerA: "Alice",
      speakerB: "Bob",
      explanation: "Direct conflict regarding release schedule policy.",
    };
    const invalid = {
      id: "cnt-1",
      statementA: "Only one statement",
    };

    expect(isContradictionSignal(valid)).toBe(true);
    expect(isContradictionSignal(invalid)).toBe(false);
  });

  it("should return true for valid CitationReference and false for invalid", () => {
    const valid = {
      id: "cit-1",
      meetingId: "m-1",
      sourceText: "Latency reduced by 40%.",
      segmentId: "seg-5",
      timestamp: 120,
      speakerName: "Charlie",
      claimVerified: true,
    };
    const invalid = {
      id: "cit-1",
      sourceText: "",
    };

    expect(isCitationReference(valid)).toBe(true);
    expect(isCitationReference(invalid)).toBe(false);
  });
});
