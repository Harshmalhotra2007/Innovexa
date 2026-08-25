const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { MeetBot } = require("./meetBot");
const { handoffToPipeline } = require("./handoff");
const logger = require("./logger");
const metrics = require("./metrics");

const PORT = process.env.PORT || process.env.BOT_PORT || 3000;

// Active bot sessions map for manual disconnect / leave triggers
const activeSessions = new Map();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  if (method === "GET" && (url === "/health" || url === "/")) {
    return sendJson(res, 200, {
      status: "healthy",
      service: "innovexa-meet-bot",
      activeSessions: activeSessions.size,
      metrics: metrics.getSummary(),
      timestamp: new Date().toISOString(),
    });
  }

  if (method === "GET" && url === "/metrics") {
    return sendJson(res, 200, metrics.getSummary());
  }

  if (method === "POST" && url === "/bot/join") {
    let bodyStr = "";
    req.on("data", (chunk) => {
      bodyStr += chunk.toString();
    });

    req.on("end", async () => {
      let body = {};
      try {
        if (bodyStr) body = JSON.parse(bodyStr);
      } catch (e) {
        return sendJson(res, 400, { status: "error", error: "Invalid JSON payload" });
      }

      const { meetingUrl, botName = process.env.BOT_NAME || "Innovexa Notetaker", metadata } = body;

      if (!meetingUrl) {
        logger.warn("Received /bot/join request missing meetingUrl");
        return sendJson(res, 400, { status: "error", error: "Missing required parameter: meetingUrl" });
      }

      logger.info(`Received /bot/join request for URL: ${meetingUrl}`, { meetingUrl, botName });

      try {
        const bot = new MeetBot();
        activeSessions.set(meetingUrl, bot);

        const audioFile = await bot.join(meetingUrl, botName);
        activeSessions.delete(meetingUrl);

        logger.info(`Meeting session finished. Audio recorded to: ${audioFile}`);

        const handoffResult = await handoffToPipeline(audioFile, meetingUrl, metadata || {});

        return sendJson(res, 200, {
          status: "success",
          audioFile,
          meetingUrl,
          botName,
          handoff: handoffResult,
        });
      } catch (error) {
        activeSessions.delete(meetingUrl);
        logger.error(`Error processing /bot/join task: ${error.message}`, { error: error.message, meetingUrl });
        return sendJson(res, 500, {
          status: "error",
          error: error.message,
          meetingUrl,
        });
      }
    });
    return;
  }

  // POST /bot/leave Endpoint: Disconnect bot immediately from Google Meet room
  if (method === "POST" && url === "/bot/leave") {
    let bodyStr = "";
    req.on("data", (chunk) => {
      bodyStr += chunk.toString();
    });

    req.on("end", async () => {
      let body = {};
      try {
        if (bodyStr) body = JSON.parse(bodyStr);
      } catch (e) {
        return sendJson(res, 400, { status: "error", error: "Invalid JSON payload" });
      }

      const { meetingUrl } = body;

      logger.info("Received /bot/leave request", { meetingUrl });

      let disconnectedCount = 0;
      for (const [key, bot] of activeSessions.entries()) {
        if (!meetingUrl || key.includes(meetingUrl) || meetingUrl.includes(key)) {
          if (bot && typeof bot.leave === "function") {
            await bot.leave().catch(() => {});
          }
          activeSessions.delete(key);
          disconnectedCount++;
        }
      }

      return sendJson(res, 200, {
        status: "success",
        message: `Bot disconnected from ${disconnectedCount} active meeting session(s).`,
        disconnectedCount,
      });
    });
    return;
  }

  return sendJson(res, 404, { status: "error", error: "Not Found" });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`Innovexa Meet Bot service running on port ${PORT}`);
  });
}

module.exports = server;
