import { VectorStoreManager } from "../src/lib/vector-store";
import { db } from "../src/lib/db";

// Mock Prisma DB
jest.mock("../src/lib/db", () => ({
  db: {
    decision: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    meeting: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    meetingSegment: {
      count: jest.fn(),
    },
  },
}));

describe("VectorStoreManager - Vector Database & Embedding Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate deterministic L2-normalized 384-dimensional local embeddings", () => {
    const text = "Database architecture decisions regarding postgres clustering and ChromaDB";
    const vector = VectorStoreManager.generateLocalEmbedding(text, 384);

    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(384);

    // Verify L2 norm is approximately 1.0
    const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 2);
  });

  it("should calculate exact cosine similarity between identical and orthogonal vectors", () => {
    const vecA = [1, 0, 0, 0];
    const vecB = [1, 0, 0, 0];
    const vecC = [0, 1, 0, 0];

    const simIdentical = VectorStoreManager.cosineSimilarity(vecA, vecB);
    const simOrthogonal = VectorStoreManager.cosineSimilarity(vecA, vecC);

    expect(simIdentical).toBeCloseTo(1.0, 4);
    expect(simOrthogonal).toBeCloseTo(0.0, 4);
  });

  it("should perform hybrid vector search across decisions and tasks", async () => {
    (db.decision.findMany as jest.Mock).mockResolvedValue([
      {
        id: "dec-101",
        title: "Adopt ChromaDB for meeting transcript search",
        context: "Vector database for semantic similarity",
        rationale: "Fast approximate nearest neighbor search",
        department: "Engineering",
        tags: ["vector", "chromadb", "ai"],
        createdAt: new Date(),
        meeting: { title: "Architecture Sync" },
      },
    ]);
    (db.task.findMany as jest.Mock).mockResolvedValue([]);
    (db.meeting.findMany as jest.Mock).mockResolvedValue([]);

    const results = await VectorStoreManager.queryKnowledgeBase("ChromaDB vector search", {
      department: "Engineering",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("decision");
    expect(results[0].title).toContain("Adopt ChromaDB");
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it("should return healthy diagnostic telemetry", async () => {
    (db.decision.count as jest.Mock).mockResolvedValue(15);
    (db.meetingSegment.count as jest.Mock).mockResolvedValue(45);

    const health = await VectorStoreManager.getHealth();
    expect(health.status).toBeDefined();
    expect(health.embeddingDimensions).toBe(384);
    expect(health.totalIndexedItems).toBeGreaterThanOrEqual(0);
  });
});
