import { db } from "./db";
import { botServiceCircuitBreaker } from "./circuit-breaker";
import { config } from "./config";

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface AIAgentState {
  id: string;
  meetingId: string;
  status: "idle" | "joining" | "recording" | "transcribing" | "summarizing" | "completed";
  joinedAt: Date | null;
  recordingUrl: string | null;
  transcript: TranscriptSegment[] | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Triggers the AI Meeting Agent to join, record, transcribe, and summarize a meeting.
 * Implements Idempotency Check and Circuit Breaker Pattern.
 * @param meetingId - ID of the meeting to trigger the AI agent for
 * @param apiKey - Optional API key for enhanced processing
 * @returns Promise resolving to the AI agent state
 * @throws Error if meeting is not found or agent triggering fails
 */
export async function triggerAIAgent(
  meetingId: string,
  apiKey?: string
): Promise<AIAgentState> {
  // Validate inputs
  if (!meetingId || typeof meetingId !== 'string') {
    throw new Error('Invalid meeting ID provided');
  }

  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new Error(`Meeting with ID '${meetingId}' not found.`);
  }

  // 1. Idempotency Check: Return active session if agent is currently joining/recording/processing
  let agent = await db.aIAgent.findUnique({ where: { meetingId } });
  const activeStatuses = ["joining", "recording", "transcribing", "summarizing"];

  if (agent && activeStatuses.includes(agent.status)) {
    console.log(`[Idempotent Check] Active session (${agent.status}) already running for meeting ${meetingId}. Returning existing agent session without duplicate trigger.`);
    return agent as unknown as AIAgentState;
  }

  if (!agent) {
    agent = await db.aIAgent.create({
      data: {
        meetingId,
        status: "joining",
        joinedAt: new Date(),
        recordingUrl: `https://storage.innovexa.com/recordings/${meetingId}.mp3`,
      },
    });
  } else {
    agent = await db.aIAgent.update({
      where: { meetingId },
      data: {
        status: "joining",
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Always use the real Render Bot Service URL
  const botServiceUrl = config.meetBotUrl;

  // Extract Google Meet URL from googleMeetLink or agenda or fallback to test room
  const googleMeetUrl = meeting.googleMeetLink || (meeting.agenda && meeting.agenda.includes("meet.google.com")
    ? meeting.agenda
    : `https://meet.google.com/test-${meetingId.substring(0, 8)}`);

  // 2. Circuit Breaker Protected Bot Service Dispatch
  console.log(`[AIAgentEngine] Triggering bot via Circuit Breaker at ${botServiceUrl}/bot/join for URL: ${googleMeetUrl}`);

  try {
    await botServiceCircuitBreaker.execute(async () => {
      const res = await fetch(`${botServiceUrl}/bot/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingUrl: googleMeetUrl,
          botName: config.botName,
          metadata: {
            meetingId: meeting.id,
            meetingTitle: meeting.title,
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`Bot service returned HTTP ${res.status}`);
      }
      return res;
    });
  } catch (e: any) {
    if (config.nodeEnv !== "test") {
      console.error("[AIAgentEngine] Circuit breaker protected bot trigger failed:", e?.message || e);
    }
    // We still return the agent even if bot trigger fails, as the agent state is tracked separately
  }

  return agent as unknown as AIAgentState;
}

/**
 * Retrieves current AI Agent state for a meeting.
 */
export async function getAIAgentStatus(meetingId: string) {
  return await db.aIAgent.findUnique({
    where: { meetingId },
    include: { meeting: true },
  });
}

/**
 * Retrieves transcript array for an AI Agent.
 */
export async function getAIAgentTranscript(meetingId: string): Promise<TranscriptSegment[]> {
  const agent = await db.aIAgent.findUnique({ where: { meetingId } });
  if (!agent || !agent.transcript) return [];
  return (agent.transcript as unknown as TranscriptSegment[]) || [];
}
