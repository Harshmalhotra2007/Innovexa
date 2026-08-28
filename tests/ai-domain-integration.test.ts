import {
  validateMeetingSegment,
  validateActionItem,
  validateExecutiveSummary,
} from "../src/lib/validators/ai-domain-validator";

describe("AI Domain Pipeline - Integration Pass", () => {
  it("should process and validate simulated raw LLM speech extraction payloads", () => {
    const rawLLMOutput = {
      id: "seg-realtime-888",
      meetingId: "meet-sync-999",
      speakerName: "Lead Architect",
      text: "We are configuring the LiveKit Egress container with headless Chrome permission flags.",
      startTime: 30.5,
      endTime: 36.2,
      confidence: 0.96,
      sentiment: "POSITIVE",
      isKeyTakeaway: true,
    };

    const result = validateMeetingSegment(rawLLMOutput);
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data?.text).toContain("LiveKit Egress");
    expect(result.data?.speakerId).toBe("speaker-0"); // Default applied
  });

  it("should return detailed 422 error list when LLM output violates schema constraints", () => {
    const malformedLLMOutput = {
      id: "act-err-1",
      meetingId: "meet-sync-999",
      title: "Hi", // Too short
      assigneeEmail: "not-an-email", // Malformed email
      dueDate: "invalid-date-format", // Malformed date
      priority: "SUPER_URGENT", // Invalid enum value
    };

    const result = validateActionItem(malformedLLMOutput);
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(422);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThanOrEqual(3);
  });

  it("should validate and compute structured executive summary pipeline response", () => {
    const fullSummaryPayload = {
      meetingId: "meet-sync-999",
      overview: "Sprint 42 retrospective focusing on real-time WebRTC audio reliability and database clustering.",
      keyOutcomes: [
        "Eliminated audio buffer crashes",
        "Configured circuit breaker for bot fallback",
      ],
      blockersAndRisks: [],
      nextSteps: ["Ship release to staging"],
      sentimentOverview: {
        positiveRatio: 0.85,
        neutralRatio: 0.15,
        negativeRatio: 0.0,
        overallSentiment: "POSITIVE",
      },
    };

    const result = validateExecutiveSummary(fullSummaryPayload);
    expect(result.success).toBe(true);
    expect(result.data?.keyOutcomes.length).toBe(2);
    expect(result.data?.generatedAt).toBeDefined();
  });
});
