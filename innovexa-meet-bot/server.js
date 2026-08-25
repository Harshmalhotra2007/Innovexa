const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { joinMeeting } = require("./joinMeeting");
const { handoffToPipeline } = require("./handoff");
const logger = require("./logger");

const PORT = process.env.BOT_PORT || process.env.PORT || 3000;

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
      timestamp: new Date().toISOString(),
    });
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

      const { meetingUrl, botName, metadata } = body;

      if (!meetingUrl) {
        logger.warn("Received /bot/join request missing meetingUrl");
        return sendJson(res, 400, { status: "error", error: "Missing required parameter: meetingUrl" });
      }

      logger.info(`Received /bot/join request for URL: ${meetingUrl}`);

      try {
        const audioFile = await joinMeeting(meetingUrl, botName);
        logger.info(`Meeting session finished. Audio recorded to: ${audioFile}`);

        const handoffResult = await handoffToPipeline(audioFile, meetingUrl, metadata || {});

        return sendJson(res, 200, {
          status: "success",
          audioFile,
          meetingUrl,
          botName: botName || process.env.BOT_NAME || "Innovexa Notetaker",
          handoff: handoffResult,
        });
      } catch (error) {
        logger.error(`Error processing /bot/join task: ${error.message}`);
        return sendJson(res, 500, {
          status: "error",
          error: error.message,
          meetingUrl,
        });
      }
    });
    return;
  }

  return sendJson(res, 404, { status: "error", error: "Not Found" });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    logger.info(`Innovexa Meet Bot service running on port ${PORT}`);
  });
}

module.exports = server;
