import { db } from "./db";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);
const vectorCache = new Map<string, number[]>();

export interface SearchResultItem {
  id: string;
  type: "decision" | "meeting" | "task" | "segment" | "chunk";
  title: string;
  content: string;
  score: number; // 0 to 1
  department: string;
  meetingId?: string;
  meetingTitle?: string;
  date?: string;
  tags?: string[];
  ownerName?: string;
  status?: string;
}

/**
 * Generate embedding vector using local Python SentenceTransformers with in-memory caching & non-blocking exec
 */
async function getChromaQueryVector(query: string): Promise<number[] | null> {
  const cacheKey = query.trim().toLowerCase();
  if (vectorCache.has(cacheKey)) {
    return vectorCache.get(cacheKey)!;
  }

  try {
    const scriptPath = path.join(process.cwd(), "ai-agent-service/oracle_core_worker.py");
    const cleanQuery = query.replace(/"/g, '\\"').replace(/[\r\n]+/g, " ");
    
    const { stdout } = await execPromise(`python "${scriptPath}" --embed "${cleanQuery}"`, { timeout: 3000 });
    const parsed = JSON.parse(stdout.trim());
    if (Array.isArray(parsed)) {
      vectorCache.set(cacheKey, parsed);
      if (vectorCache.size > 200) {
        const firstKey = vectorCache.keys().next().value;
        if (firstKey) vectorCache.delete(firstKey);
      }
      return parsed;
    }
  } catch (err) {
    console.warn("[VectorSearch] Async embedding generation skipped or timed out:", err);
  }
  return null;
}

/**
 * Query persistent ChromaDB vector store collection via REST API
 */
async function queryChromaCollection(vector: number[], limit: number = 5): Promise<any[]> {
  const chromaUrl = config.chromaDbUrl;
  try {
    // 1. Fetch collection metadata to get uuid
    const getCollRes = await fetch(`${chromaUrl}/api/v1/collections/meeting_transcripts`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 }
    });
    if (!getCollRes.ok) return [];
    const coll = await getCollRes.json();
    const collId = coll.id;

    // 2. Execute vector similarity search
    const queryRes = await fetch(`${chromaUrl}/api/v1/collections/${collId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query_embeddings: [vector],
        n_results: limit,
      }),
      next: { revalidate: 0 }
    });
    if (!queryRes.ok) return [];
    const data = await queryRes.json();
    
    const results = [];
    const docs = data.documents[0] || [];
    const metadatas = data.metadatas[0] || [];
    const ids = data.ids[0] || [];
    const distances = data.distances ? (data.distances[0] || []) : [];

    for (let i = 0; i < docs.length; i++) {
      results.push({
        id: ids[i],
        content: docs[i],
        metadata: metadatas[i],
        score: distances[i] !== undefined ? Math.max(0, 1 - distances[i]) : 0.8,
      });
    }
    return results;
  } catch (err) {
    console.warn("[VectorSearch] ChromaDB collection query failed. Falling back to Postgres search.");
    return [];
  }
}

/**
 * Compute cosine similarity locally using term frequencies as fallback
 */
function tfCosineSimilarity(text1: string, text2: string): number {
  const tokenize = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};
  tokens1.forEach((t) => (freq1[t] = (freq1[t] || 0) + 1));
  tokens2.forEach((t) => (freq2[t] = (freq2[t] || 0) + 1));

  const allWords = Array.from(new Set([...Object.keys(freq1), ...Object.keys(freq2)]));
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  allWords.forEach((word) => {
    const v1 = freq1[word] || 0;
    const v2 = freq2[word] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

export async function performSemanticSearch(
  query: string, 
  departmentFilter?: string, 
  startDate?: string, 
  endDate?: string
): Promise<SearchResultItem[]> {
  if (!query || query.trim().length === 0) return [];
  const results: SearchResultItem[] = [];
  
  // 1. Attempt to search in ChromaDB using vector representation
  const queryVector = await getChromaQueryVector(query);
  if (queryVector) {
    const chromaMatches = await queryChromaCollection(queryVector, 10);
    for (const match of chromaMatches) {
      const meetingId = match.metadata.meeting_id;
      if (!meetingId) continue;

      const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
      if (!meeting) continue;

      // Filter by department and date range
      if (departmentFilter && departmentFilter !== "All" && meeting.department !== departmentFilter) continue;
      if (startDate && new Date(meeting.date) < new Date(startDate)) continue;
      if (endDate && new Date(meeting.date) > new Date(endDate)) continue;

      results.push({
        id: match.id,
        type: "chunk",
        title: `Transcript segment: "${meeting.title}"`,
        content: match.content,
        score: match.score,
        department: meeting.department || "General",
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        date: meeting.date.toISOString().split("T")[0],
      });
    }
  }

  // 2. Fetch Decisions, Tasks from PostgreSQL for hybrid search
  const decisions = await db.decision.findMany({ 
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { meeting: true } 
  });
  for (const dec of decisions) {
    if (departmentFilter && departmentFilter !== "All" && dec.department !== departmentFilter) continue;
    if (startDate && new Date(dec.createdAt) < new Date(startDate)) continue;
    if (endDate && new Date(dec.createdAt) > new Date(endDate)) continue;

    const fullText = `${dec.title} ${dec.context} ${dec.rationale} ${dec.tags}`;
    const score = tfCosineSimilarity(query, fullText);

    if (score > 0.05 || fullText.toLowerCase().includes(query.toLowerCase())) {
      let parsedTags: string[] = [];
      if (Array.isArray(dec.tags)) {
        parsedTags = dec.tags;
      }
      results.push({
        id: dec.id, 
        type: "decision", 
        title: dec.title,
        content: `${dec.context} — Rationale: ${dec.rationale || "N/A"}`,
        score: Math.max(score, fullText.toLowerCase().includes(query.toLowerCase()) ? 0.75 : score),
        department: dec.department, 
        meetingId: dec.meetingId, 
        meetingTitle: dec.meeting?.title,
        date: dec.createdAt.toISOString().split("T")[0], 
        tags: parsedTags,
      });
    }
  }

  const tasks = await db.task.findMany({ 
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { meeting: true } 
  });
  for (const t of tasks) {
    if (departmentFilter && departmentFilter !== "All" && t.department !== departmentFilter) continue;
    if (startDate && t.meeting && new Date(t.meeting.date) < new Date(startDate)) continue;
    if (endDate && t.meeting && new Date(t.meeting.date) > new Date(endDate)) continue;

    const fullText = `${t.title} ${t.description} ${t.ownerName} ${t.status}`;
    const score = tfCosineSimilarity(query, fullText);

    if (score > 0.05 || fullText.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        id: t.id, 
        type: "task", 
        title: `Task: ${t.title}`,
        content: t.description || `Assigned to ${t.ownerName} (Status: ${t.status})`,
        score: Math.max(score, fullText.toLowerCase().includes(query.toLowerCase()) ? 0.7 : score),
        department: t.department, 
        meetingId: t.meetingId || undefined, 
        meetingTitle: t.meeting?.title,
        ownerName: t.ownerName, 
        status: t.status,
        date: t.createdAt.toISOString().split("T")[0],
      });
    }
  }

  // Sort by score descending and return top 5
  results.sort((a, b) => b.score - a.score);
  
  // Deduplicate results by content to keep clean lists
  const seenContent = new Set<string>();
  const uniqResults = results.filter((item) => {
    const key = item.content.slice(0, 100);
    if (seenContent.has(key)) return false;
    seenContent.add(key);
    return true;
  });

  return uniqResults.slice(0, 5);
}
