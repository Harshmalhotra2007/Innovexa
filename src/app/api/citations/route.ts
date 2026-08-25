import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId search parameter" }, { status: 400 });
    }

    const citations = await db.citation.findMany({
      where: { meetingId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(citations);
  } catch (err: any) {
    console.error("GET /api/citations error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
