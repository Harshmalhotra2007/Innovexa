import { GET as searchGet } from "../src/app/api/search/route";
import { GET as healthGet } from "../src/app/api/search/health/route";
import { POST as indexPost } from "../src/app/api/search/index/route";
import { POST as qaPost } from "../src/app/api/search/qa/route";
import { VectorStoreManager } from "../src/lib/vector-store";

jest.mock("../src/lib/vector-store", () => ({
  VectorStoreManager: {
    queryKnowledgeBase: jest.fn(),
    getHealth: jest.fn(),
    indexKnowledgeBase: jest.fn(),
  },
}));

describe("Semantic Search API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty list when query string is empty in /api/search", async () => {
    const req = new Request("http://localhost/api/search?q=");
    const res = await searchGet(req);
    const data = await res.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("should delegate query to VectorStoreManager in /api/search", async () => {
    (VectorStoreManager.queryKnowledgeBase as jest.Mock).mockResolvedValue([
      {
        id: "res-1",
        type: "decision",
        title: "Cluster Scaling",
        content: "Scale clusters dynamically",
        score: 0.92,
      },
    ]);

    const req = new Request("http://localhost/api/search?q=scaling&department=Engineering");
    const res = await searchGet(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Cluster Scaling");
    expect(VectorStoreManager.queryKnowledgeBase).toHaveBeenCalledWith("scaling", {
      department: "Engineering",
      startDate: undefined,
      endDate: undefined,
      limit: 6,
    });
  });

  it("should return vector store health telemetry in /api/search/health", async () => {
    (VectorStoreManager.getHealth as jest.Mock).mockResolvedValue({
      status: "ONLINE",
      provider: "ChromaDB",
      collections: ["meeting_transcripts"],
      totalIndexedItems: 100,
      embeddingDimensions: 384,
      endpoint: "http://localhost:8000",
    });

    const res = await healthGet();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ONLINE");
    expect(data.provider).toBe("ChromaDB");
  });

  it("should trigger knowledge base indexing in /api/search/index", async () => {
    (VectorStoreManager.indexKnowledgeBase as jest.Mock).mockResolvedValue({
      indexedCount: 42,
      status: "SUCCESS",
    });

    const res = await indexPost();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.indexedCount).toBe(42);
  });

  it("should generate grounded Q&A answer with citations in /api/search/qa", async () => {
    (VectorStoreManager.queryKnowledgeBase as jest.Mock).mockResolvedValue([
      {
        id: "chunk-1",
        type: "decision",
        title: "Postgres Migration",
        content: "Postgres was selected as the unified database engine.",
        meetingId: "meet-999",
        score: 0.95,
      },
    ]);

    const req = new Request("http://localhost/api/search/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Which database engine was selected?" }),
    });

    const res = await qaPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.answer).toBeDefined();
    expect(data.citations.length).toBe(1);
    expect(data.citations[0].meetingId).toBe("meet-999");
  });
});
