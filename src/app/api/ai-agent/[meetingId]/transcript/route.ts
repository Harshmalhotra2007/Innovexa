import { NextResponse } from "next/server";
import { getAIAgentTranscript } from "@/lib/ai-agent-engine";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;
    if (!meetingId) {
      return NextResponse.json({ error: "meetingId parameter is required" }, { status: 400 });
    }

    const transcript = await getAIAgentTranscript(meetingId);
    return NextResponse.json(transcript, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch AI agent transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
