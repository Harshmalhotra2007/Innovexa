import { db } from "./db";

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
 */
export async function triggerAIAgent(
  meetingId: string,
  apiKey?: string
): Promise<AIAgentState> {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new Error(`Meeting with ID '${meetingId}' not found.`);
  }

  // 1. Check or initialize AIAgent record
  let agent = await db.aIAgent.findUnique({ where: { meetingId } });

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
  const botServiceUrl = process.env.MEET_BOT_URL || "https://innovexa-meet-bot.onrender.com";
  
  // Extract Google Meet URL from agenda or fallback to test room
  const googleMeetUrl = meeting.agenda && meeting.agenda.includes("meet.google.com")
    ? meeting.agenda
    : `https://meet.google.com/test-${meetingId.substring(0, 8)}`;

  // Send trigger payload directly to live cloud bot service
  console.log(`[AIAgentEngine] Triggering real bot at ${botServiceUrl}/bot/join for URL: ${googleMeetUrl}`);
  
  fetch(`${botServiceUrl}/bot/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meetingUrl: googleMeetUrl,
      botName: process.env.BOT_NAME || "Innovexa Notetaker",
      metadata: {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
      },
    }),
  }).catch((e) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[AIAgentEngine] Live bot trigger failed:", e.message);
    }
  });

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
