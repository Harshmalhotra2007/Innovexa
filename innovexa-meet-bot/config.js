const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const config = {
  bot: {
    name: process.env.BOT_NAME || "Innovexa Notetaker",
    port: parseInt(process.env.PORT || process.env.BOT_PORT || "3000", 10),
    maxMeetingDurationMs: parseInt(process.env.MAX_MEETING_DURATION_MS || "3600000", 10), // 1 hour default
    admissionTimeoutMs: parseInt(process.env.ADMISSION_TIMEOUT_MS || "300000", 10), // 5 min default
    headless: process.env.HEADLESS !== "false",
  },
  retry: {
    maxJoinRetries: 5,
    maxLeaveRetries: 3,
    initialBackoffMs: 300,
    maxBackoffMs: 3000,
    backoffFactor: 1.5,
  },
  watchdog: {
    intervalMs: 15000,
    maxAloneChecks: 3,
  },
  urls: {
    renderBotService: process.env.MEET_BOT_URL || "https://innovexa-meet-bot.onrender.com",
    n8nWebhook: process.env.N8N_WEBHOOK_URL || "http://n8n:5678/webhook/innovexa-meeting",
  },
  audio: {
    outputDir: process.env.AUDIO_OUTPUT_DIR || "/recordings",
    defaultQuality: process.env.DEFAULT_AUDIO_QUALITY || "medium",
  },
};

module.exports = config;
