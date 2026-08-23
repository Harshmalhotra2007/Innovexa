import { db } from "./db";

export interface SearchResultItem {
  id: string;
  type: "decision" | "meeting" | "task" | "segment";
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

// In-memory cache to avoid rate-limiting on HF API for the demo
const embeddingCache = new Map<string, number[]>();

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("No API key");
  const res = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
    headers: { Authorization: `Bearer ${apiKey}` },
    method: "POST",
    body: JSON.stringify({ inputs: [text] }),
  });
  if (!res.ok) throw new Error(`HF API error: ${res.statusText}`);
  const data = await res.json();
  return data[0] as number[];
}

async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const hashText = text.slice(0, 100); // simplify cache key
  if (embeddingCache.has(hashText)) return embeddingCache.get(hashText)!;
  try {
    const emb = await getEmbedding(text);
    embeddingCache.set(hashText, emb);
    return emb;
  } catch (e) {
    console.error("Embedding error, falling back to basic similarity:", e);
    return null;
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function computeBasicSimilarity(text1: string, text2: string): number {
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

export async function performSemanticSearch(query: string, departmentFilter?: string): Promise<SearchResultItem[]> {
  if (!query || query.trim().length === 0) return [];
  const results: SearchResultItem[] = [];
  
  // Attempt to get query embedding
  const queryEmbedding = await getCachedEmbedding(query);

  const decisions = await db.decision.findMany({ include: { meeting: true } });
  for (const dec of decisions) {
    if (departmentFilter && departmentFilter !== "All" && dec.department !== departmentFilter) continue;
    const fullText = `${dec.title} ${dec.context} ${dec.rationale} ${dec.tags}`;
    
    let score = 0;
    if (queryEmbedding) {
        const docEmbedding = await getCachedEmbedding(fullText);
        if (docEmbedding) {
            score = cosineSimilarity(queryEmbedding, docEmbedding);
        } else {
            score = computeBasicSimilarity(query, fullText);
        }
    } else {
        score = computeBasicSimilarity(query, fullText);
    }

    if (score > 0.05 || fullText.toLowerCase().includes(query.toLowerCase()) || (queryEmbedding && score > 0.3)) {
      let parsedTags: string[] = [];
      try { parsedTags = JSON.parse(dec.tags); } catch { parsedTags = [dec.department]; }
      results.push({
        id: dec.id, type: "decision", title: dec.title,
        content: `${dec.context} — Rationale: ${dec.rationale || "N/A"}`,
        score: Math.max(score, fullText.toLowerCase().includes(query.toLowerCase()) ? 0.75 : score),
        department: dec.department, meetingId: dec.meetingId, meetingTitle: dec.meeting?.title,
        date: dec.createdAt.toISOString().split("T")[0], tags: parsedTags,
      });
    }
  }

  const tasks = await db.task.findMany({ include: { meeting: true } });
  for (const t of tasks) {
    if (departmentFilter && departmentFilter !== "All" && t.department !== departmentFilter) continue;
    const fullText = `${t.title} ${t.description} ${t.ownerName} ${t.status}`;
    
    let score = 0;
    if (queryEmbedding) {
        const docEmbedding = await getCachedEmbedding(fullText);
        if (docEmbedding) {
            score = cosineSimilarity(queryEmbedding, docEmbedding);
        } else {
            score = computeBasicSimilarity(query, fullText);
        }
    } else {
        score = computeBasicSimilarity(query, fullText);
    }

    if (score > 0.05 || fullText.toLowerCase().includes(query.toLowerCase()) || (queryEmbedding && score > 0.3)) {
      results.push({
        id: t.id, type: "task", title: `Task: ${t.title}`,
        content: t.description || `Assigned to ${t.ownerName} (Status: ${t.status})`,
        score: Math.max(score, fullText.toLowerCase().includes(query.toLowerCase()) ? 0.7 : score),
        department: t.department, meetingId: t.meetingId || undefined, meetingTitle: t.meeting?.title,
        ownerName: t.ownerName, status: t.status,
      });
    }
  }

  const segments = await db.meetingSegment.findMany({ include: { meeting: true } });
  for (const seg of segments) {
    if (departmentFilter && departmentFilter !== "All" && seg.meeting.department !== departmentFilter) continue;
    const fullText = `${seg.speaker}: ${seg.text}`;
    
    let score = 0;
    if (queryEmbedding) {
        const docEmbedding = await getCachedEmbedding(fullText);
        if (docEmbedding) {
            score = cosineSimilarity(queryEmbedding, docEmbedding);
        } else {
            score = computeBasicSimilarity(query, fullText);
        }
    } else {
        score = computeBasicSimilarity(query, fullText);
    }

    if (score > 0.1 || (queryEmbedding && score > 0.3)) {
      results.push({
        id: seg.id, type: "segment", title: `Transcript snippet (${seg.speaker})`,
        content: seg.text, score,
        department: seg.meeting.department || "General", meetingId: seg.meetingId,
        meetingTitle: seg.meeting.title, date: seg.meeting.date.toISOString().split("T")[0],
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 3); // spec says "Return top 3 matches"
}
