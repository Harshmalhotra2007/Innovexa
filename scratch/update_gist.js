const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const gistId = "45f4e0923ab297ed9e1c029b88eedd14";

const filesToUpload = {
  "README.md": path.join(__dirname, "../README.md"),
  "schema.prisma": path.join(__dirname, "../prisma/schema.prisma"),
  "ai-agent-engine.ts": path.join(__dirname, "../src/lib/ai-agent-engine.ts"),
  "AIAgentPanel.tsx": path.join(__dirname, "../src/components/AIAgentPanel.tsx"),
  "meetBot.js": path.join(__dirname, "../innovexa-meet-bot/meetBot.js"),
  "useAIAgent.ts": path.join(__dirname, "../src/hooks/useAIAgent.ts"),
  "audio-validator.ts": path.join(__dirname, "../src/lib/audio-validator.ts"),
  "config.js": path.join(__dirname, "../innovexa-meet-bot/config.js"),
  "metrics.js": path.join(__dirname, "../innovexa-meet-bot/metrics.js"),
  "circuit-breaker.ts": path.join(__dirname, "../src/lib/circuit-breaker.ts"),
};

const payloadFiles = {};

for (const [filename, filepath] of Object.entries(filesToUpload)) {
  if (fs.existsSync(filepath)) {
    payloadFiles[filename] = {
      content: fs.readFileSync(filepath, "utf8"),
    };
  }
}

const payload = {
  description: "Innovexa AI Meeting Platform Core Architecture, Playwright Bot, Custom Hooks & Audio Validation Engine",
  files: payloadFiles,
};

const tempJson = path.join(__dirname, "gist_payload.json");
fs.writeFileSync(tempJson, JSON.stringify(payload));

try {
  const result = execSync(`gh api -X PATCH /gists/${gistId} --input "${tempJson}"`, { encoding: "utf8" });
  const parsed = JSON.parse(result);
  console.log("SUCCESS: Gist updated cleanly at:", parsed.html_url);
} catch (err) {
  console.error("ERROR updating Gist:", err.message);
}
