import { NextResponse } from "next/server";
import { performSemanticSearch } from "@/lib/vector-search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const department = searchParams.get("department") || "All";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const results = await performSemanticSearch(q, department, startDate, endDate);
  return NextResponse.json(results);
}
