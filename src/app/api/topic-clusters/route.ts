import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clusters = await db.topicCluster.findMany({
      include: {
        decisions: {
          include: { meeting: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clusters);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch topic clusters";
    console.error("GET /api/topic-clusters error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
