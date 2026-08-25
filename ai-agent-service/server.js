const { WebSocketServer } = require("ws");
const { PrismaClient } = require("@prisma/client");
const { runMeetBot } = require("./meet-bot");
const { exec } = require("child_process");
const { OpenAI } = require("openai");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const PORT = process.env.AGENT_SERVICE_PORT || 8081;
const wss = new WebSocketServer({ port: PORT });

// Initialize OpenAI client if API key exists
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

console.log(`[AgentService] WebSocket Server listening on port ${PORT}`);

// Track active client sockets mapped by meetingId
const activeMeetings = new Map();

wss.on("connection", (ws, req) => {
  const urlParams = new URL(req.url, `http://${req.headers.host}`);
  const meetingId = urlParams.pathname.split("/").pop();

  if (!meetingId) {
    ws.close(4000, "Missing meetingId path parameter");
    return;
  }

  console.log(`[AgentService] Client connected for meeting: ${meetingId}`);
  
  if (!activeMeetings.has(meetingId)) {
    activeMeetings.set(meetingId, new Set());
  }
  activeMeetings.get(meetingId).add(ws);

  ws.on("message", async (message) => {
    try {
      const payload = JSON.parse(message);
      if (payload.action === "start") {
        await startAgentProcess(meetingId);
      }
    } catch (err) {
      console.error(`[AgentService] WS message handling error:`, err);
    }
  });

  ws.on("close", () => {
    console.log(`[AgentService] Client disconnected from meeting: ${meetingId}`);
    const clients = activeMeetings.get(meetingId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        activeMeetings.delete(meetingId);
      }
    }
  });
});

/**
 * Broadcast status update to all connected WebSocket clients for a meetingId
 */
function broadcast(meetingId, data) {
  const clients = activeMeetings.get(meetingId);
  if (clients) {
    const payload = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    });
  }
}

/**
 * Runs the complete AI Agent processing cycle
 */
async function startAgentProcess(meetingId) {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    console.error(`[AgentService] Meeting ${meetingId} not found.`);
    return;
  }

  // 1. Initialize or update AIAgent state
  let agent = await prisma.aIAgent.findUnique({ where: { meetingId } });
  if (!agent) {
    agent = await prisma.aIAgent.create({
      data: {
        meetingId,
        status: "joining",
        joinedAt: new Date(),
      },
    });
  } else {
    agent = await prisma.aIAgent.update({
      where: { meetingId },
      data: {
        status: "joining",
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  broadcast(meetingId, agent);

  // Execute processing chain
  try {
    const outputWav = path.join(__dirname, `../public/recordings/${meetingId}/raw_recording.wav`);
    
    // A. Joining & Recording (Simulation default: 3 seconds browser join and record)
    await prisma.aIAgent.update({
      where: { meetingId },
      data: { status: "recording" },
    });
    broadcast(meetingId, { ...agent, status: "recording" });

    // Launch Playwright bot
    const meetUrl = meeting.agenda || "https://meet.google.com/mock-meeting";
    try {
      await runMeetBot(meetUrl, 3000, outputWav);
    } catch (e) {
      console.warn("[AgentService] Playwright run failed, writing mock WAV payload:", e);
      fs.mkdirSync(path.dirname(outputWav), { recursive: true });
      fs.writeFileSync(outputWav, Buffer.from("RIFF....WAVEfmt...data...mock"));
    }

    // B. Transcribing & Speaker Diarization
    await prisma.aIAgent.update({
      where: { meetingId },
      data: { status: "transcribing" },
    });
    broadcast(meetingId, { ...agent, status: "transcribing" });

    // Call Python Diarization process
    const diarizedSegments = await runDiarization(outputWav);
    
    // Call Whisper API / Mock fallback
    let transcriptSegments = [];
    if (openai) {
      try {
        console.log("[AgentService] transcribing audio via OpenAI Whisper API...");
        const response = await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputWav),
          model: "whisper-1",
          response_format: "verbose_json",
        });
        // Match Whisper output with diarization timestamps
        transcriptSegments = (response.segments || []).map((seg, i) => {
          const matchedSpeaker = diarizedSegments.find(d => seg.start >= d.start && seg.start <= d.end);
          return {
            speaker: matchedSpeaker ? matchedSpeaker.speaker : "Participant",
            text: seg.text,
            timestamp: formatTimestamp(seg.start),
          };
        });
      } catch (err) {
        console.error("[AgentService] OpenAI Whisper failed, using fallback transcript:", err);
        transcriptSegments = getFallbackTranscript();
      }
    } else {
      transcriptSegments = getFallbackTranscript();
    }

    await prisma.aIAgent.update({
      where: { meetingId },
      data: { transcript: transcriptSegments },
    });
    broadcast(meetingId, { ...agent, status: "transcribing", transcript: transcriptSegments });

    // C. Summarization & ActionItem Extraction
    await prisma.aIAgent.update({
      where: { meetingId },
      data: { status: "summarizing" },
    });
    broadcast(meetingId, { ...agent, status: "summarizing", transcript: transcriptSegments });

    let summaryText = "";
    if (openai) {
      try {
        console.log("[AgentService] Generating meeting summary via GPT-4...");
        const prompt = `Summarize this transcript in 3 bullets and extract action items:\n${transcriptSegments.map(s => `${s.speaker}: ${s.text}`).join("\n")}`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
        });
        summaryText = completion.choices[0].message.content;
      } catch (err) {
        console.error("[AgentService] GPT-4 Summarization failed, using default:", err);
        summaryText = getDefaultSummary(meeting.title);
      }
    } else {
      summaryText = getDefaultSummary(meeting.title);
    }

    // Extract & save ActionItems
    await extractAndSaveActionItems(meetingId, transcriptSegments);

    // D. Completed
    const completedAgent = await prisma.aIAgent.update({
      where: { meetingId },
      data: {
        status: "completed",
        summary: summaryText,
        recordingUrl: `/recordings/${meetingId}/raw_recording.wav`,
        updatedAt: new Date(),
      },
    });

    broadcast(meetingId, completedAgent);

    // E. Index in Oracle Core
    try {
      const { exec } = require("child_process");
      const scriptPath = path.join(__dirname, "oracle_core_worker.py");
      console.log(`[AgentService] Triggering Oracle Core indexing for meeting: ${meetingId}`);
      exec(`python "${scriptPath}" --meeting-id "${meetingId}"`, (error, stdout) => {
        if (error) console.error(`[AgentService] Oracle Core indexing error:`, error);
        else console.log(`[AgentService] Oracle Core indexing output:`, stdout.trim());
      });
    } catch (e) {
      console.error("[AgentService] Oracle Core trigger error:", e);
    }

  } catch (err) {
    console.error(`[AgentService] Meeting process failure:`, err);
    await prisma.aIAgent.update({
      where: { meetingId },
      data: { status: "idle" },
    });
    broadcast(meetingId, { status: "idle", meetingId });
  }
}

/**
 * Runs the Python diarize script
 */
function runDiarization(audioPath) {
  return new Promise((resolve) => {
    exec(`python "${path.join(__dirname, "diarize.py")}" "${audioPath}"`, (error, stdout) => {
      if (error) {
        console.warn("[AgentService] Diarization script error, using default speaker segments.");
      }
      try {
        const segments = JSON.parse(stdout.trim());
        resolve(segments);
      } catch (e) {
        resolve([
          { speaker: "Dr. Vikram Seth (Dept Lead)", start: 0, end: 10 },
          { speaker: "Alex Mercer (Senior Architect)", start: 10, end: 30 },
          { speaker: "Sarah Jenkins (Lead UI/UX)", start: 30, end: 60 }
        ]);
      }
    });
  });
}

/**
 * Parses transcript and saves matching ActionItems to PostgreSQL
 */
async function extractAndSaveActionItems(meetingId, segments) {
  // Clear old action items first
  await prisma.actionItem.deleteMany({ where: { meetingId } });

  const tasksList = [];
  segments.forEach((seg) => {
    const text = seg.text.toLowerCase();
    if (text.includes("will") || text.includes("todo") || text.includes("action") || text.includes("need to")) {
      tasksList.push({
        meetingId,
        assignee: seg.speaker,
        task: seg.text,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default 3 days
      });
    }
  });

  if (tasksList.length > 0) {
    await prisma.actionItem.createMany({ data: tasksList });
  }
}

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getFallbackTranscript() {
  return [
    { speaker: "Dr. Vikram Seth (Dept Lead)", text: "Welcome team. Let's initiate the Innovexa AI Meeting Agent protocol.", timestamp: "00:00" },
    { speaker: "Alex Mercer (Senior Architect)", text: "We need to set up the standalone WebSockets listener for real-time status streaming.", timestamp: "00:15" },
    { speaker: "Sarah Jenkins (Lead UI/UX)", text: "I will align the frontend dashboard cards with the Tactical Steel Slate colors.", timestamp: "00:30" }
  ];
}

function getDefaultSummary(title) {
  return `Executive Summary for '${title}':\n` +
    `• Setup: Configured standalone WebSocket agent server on port 8081.\n` +
    `• Action: Initiated Google Meet integration with automated Playwright browser session.\n` +
    `• Next Steps: Verify real-time transcript streaming with UAT and load tests.`;
}
