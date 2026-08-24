import { NextResponse } from "next/server";
import { triggerAIAgent } from "@/lib/ai-agent-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "organizer") {
      return NextResponse.json(
        { error: "Forbidden: Only meeting organizers can trigger the AI Agent" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { meetingId, apiKey } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    const agent = await triggerAIAgent(meetingId, apiKey);
    return NextResponse.json(agent, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to join meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
