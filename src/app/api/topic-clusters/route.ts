import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clusters = await db.topicCluster.findMany({
      include: {
        decisions: {
          include: { meeting: true }
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clusters);
  } catch (err: any) {
    console.error("GET /api/topic-clusters error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
