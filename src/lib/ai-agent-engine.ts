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
 * Default sample transcript templates for AI Agent ingestion & diarization
 */
const SAMPLE_DIARIZED_TRANSCRIPTS: Record<string, TranscriptSegment[]> = {
  default: [
    {
      speaker: "Dr. Vikram Seth (Dept Lead)",
      text: "Welcome team. Let's initiate the Innovexa AI Meeting Agent protocol and review system parameters.",
      timestamp: "00:00:02",
    },
    {
      speaker: "Alex Mercer (Senior Architect)",
      text: "The AI Agent model and SSE real-time stream routes are active. Audio streams are encrypted and processed via Whisper ASR.",
      timestamp: "00:00:15",
    },
    {
      speaker: "Sarah Jenkins (Lead UI/UX)",
      text: "The Cyberpunk Purple UI panel features terminal pulse indicators and real-time caption feeds with speaker badges.",
      timestamp: "00:00:32",
    },
    {
      speaker: "Innovexa AI Agent",
      text: "System status nominal. Diarization active, action items extracted, and 30-day retention policies enforced.",
      timestamp: "00:00:50",
    },
  ],
};

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

  // Trigger external Dockerized Meet Bot service if available
  const botServiceUrl = process.env.MEET_BOT_URL;
  const googleMeetUrl = meeting.agenda && meeting.agenda.includes("meet.google.com")
    ? meeting.agenda
    : null;

  if (botServiceUrl && googleMeetUrl) {
    // Real Bot Mode: Send request to Render Bot Service
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
      console.log("External Meet Bot trigger error:", e.message);
    });

    // Update status to joining for real bot
    await db.aIAgent.update({
      where: { meetingId },
      data: { status: "joining", updatedAt: new Date() },
    });
  } else {
    // Simulation Fallback Mode (only when MEET_BOT_URL or Google Meet URL is missing)
    setTimeout(async () => {
      try {
        await db.aIAgent.update({
          where: { meetingId },
          data: { status: "recording" },
        });
        await new Promise((res) => setTimeout(res, 2000));

        const transcriptSegments = SAMPLE_DIARIZED_TRANSCRIPTS.default;
        await db.aIAgent.update({
          where: { meetingId },
          data: {
            status: "transcribing",
            transcript: transcriptSegments as any,
          },
        });
        await new Promise((res) => setTimeout(res, 2000));

        const summaryText = `Executive AI Summary for '${meeting.title}':\n` +
          `• Core Focus: AI Agent integration and Whisper ASR diarization.\n` +
          `• Key Decisions: Adopted S3/Supabase encrypted storage and 30-day retention policies.\n` +
          `• Next Steps: Monitor SLA escalation engine and finalize review.`;

        await db.aIAgent.update({
          where: { meetingId },
          data: {
            status: "summarizing",
            summary: summaryText,
          },
        });
        await new Promise((res) => setTimeout(res, 2000));

        await db.aIAgent.update({
          where: { meetingId },
          data: {
            status: "completed",
            updatedAt: new Date(),
          },
        });
      } catch (err) {
        console.error("AI Agent simulation error:", err);
      }
    }, 100);
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
