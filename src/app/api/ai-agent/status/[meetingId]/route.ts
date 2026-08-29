import { NextResponse } from "next/server";
import { getAIAgentStatus } from "@/lib/ai-agent-engine";
import { apiHandler, ApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { meetingId: string } }
) {
  return apiHandler(async (req) => {
    const { meetingId } = params;
    if (!meetingId) {
      throw new ApiError(400, "meetingId parameter is required");
    }

    const agent = await getAIAgentStatus(meetingId);
    if (!agent) {
      return { status: "idle", meetingId };
    }

    return agent;
  });
}
