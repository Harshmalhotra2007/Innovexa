import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contradictions = await db.contradiction.findMany({
      include: {
        decision1: {
          include: { meeting: true }
        },
        decision2: {
          include: { meeting: true }
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contradictions);
  } catch (err: any) {
    console.error("GET /api/contradictions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
