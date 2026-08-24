import { NextResponse } from "next/server";
import { getAIAgentStatus } from "@/lib/ai-agent-engine";

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

    const agent = await getAIAgentStatus(meetingId);
    if (!agent) {
      return NextResponse.json({ status: "idle", meetingId }, { status: 200 });
    }

    return NextResponse.json(agent, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch AI agent status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
