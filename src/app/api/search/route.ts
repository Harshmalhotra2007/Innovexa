import { NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const department = searchParams.get("department") || "All";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    if (!q.trim()) {
      return NextResponse.json([]);
    }

    const results = await VectorStoreManager.queryKnowledgeBase(q, {
      department,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Search API Error]", error);
    return NextResponse.json({ error: "Failed to perform semantic search" }, { status: 500 });
  }
}
