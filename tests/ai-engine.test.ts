import { processMeetingTranscript } from "../src/lib/ai-engine";

describe("AI Engine Transcript Processing Tests", () => {
  it("should throw an error for invalid transcript input", async () => {
    // @ts-expect-error Testing runtime invalid input
    await expect(processMeetingTranscript(null)).rejects.toThrow("Invalid transcript text provided");
  });

  it("should return executive fallback result for empty transcript text", async () => {
    const res = await processMeetingTranscript("   ", "Engineering");
    expect(res).toBeDefined();
    expect(res.summary).toContain("executive fallback synthesis");
    expect(res.decisions.length).toBeGreaterThan(0);
    expect(res.actionItems.length).toBeGreaterThan(0);
    expect(res.decisions[0].department).toBe("Engineering");
  });

  it("should extract decisions and action items from structured transcript text", async () => {
    const transcriptText = `
[00:15] Alice (Engineering): Welcome team. First item, we decided to migrate our search engine to pgvector for sub-50ms query latencies.
[00:45] Bob (Engineering): Great. Action item: Bob will configure the vector index and database connection pooling by next Monday.
[01:20] Carol (Product): I will handle the UI integration for the search filter component.
    `;

    const res = await processMeetingTranscript(transcriptText, "Engineering");

    expect(res).toBeDefined();
    expect(res.segments.length).toBe(3);

    // Verify decision extraction
    expect(res.decisions.length).toBeGreaterThan(0);
    expect(res.decisions[0].title).toBeDefined();

    // Verify action item extraction
    expect(res.actionItems.length).toBeGreaterThan(0);
    const bobAction = res.actionItems.find((item) => item.ownerName.toLowerCase().includes("bob") || item.description.toLowerCase().includes("bob"));
    expect(bobAction).toBeDefined();
  });
});