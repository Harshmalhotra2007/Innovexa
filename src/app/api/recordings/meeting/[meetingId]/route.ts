import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { meetingId } = params;

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId parameter is required" }, { status: 400 });
    }

    const recordings = await db.recording.findMany({
      where: { meetingId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(recordings, { status: 200 });
  } catch (error: any) {
    console.error("Fetch recordings error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch recordings" }, { status: 500 });
  }
}
