import { NextResponse } from "next/server";
import { performSemanticSearch } from "@/lib/vector-search";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const department = searchParams.get("department") || "All";

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const results = await performSemanticSearch(q, department);
  return NextResponse.json(results);
}
