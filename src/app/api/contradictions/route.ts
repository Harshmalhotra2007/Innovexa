import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contradictions = await db.contradiction.findMany({
      include: {
        decision1: {
          include: { meeting: true },
        },
        decision2: {
          include: { meeting: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contradictions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch contradictions";
    console.error("GET /api/contradictions error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
