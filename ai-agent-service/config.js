/**
 * Centralized Configuration Module for ai-agent-service
 * Type-safe single source of truth for microservice environment variables.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const config = {
  port: parseInt(process.env.AGENT_SERVICE_PORT || "8081", 10),
  openaiApiKey: process.env.OPENAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  botDisplayName: process.env.BOT_DISPLAY_NAME || "Innovexa Notetaker",
  googleEmail: process.env.GOOGLE_EMAIL,
  googlePassword: process.env.GOOGLE_PASSWORD,
  recordingMode: process.env.RECORDING_MODE || "batch",
  llamaBinaryPath: process.env.LLAMA_BINARY_PATH || "llama-cli",
  llamaModelPath: process.env.LLAMA_MODEL_PATH || "./models/llama-2-7b-chat.gguf",
  whisperBinaryPath: process.env.WHISPER_BINARY_PATH || "whisper-cli",
  whisperModelPath: process.env.WHISPER_MODEL_PATH || "./models/ggml-base.en.bin",
  encryptionSecretKey: process.env.ENCRYPTION_SECRET_KEY,
  defaultRetentionDays: parseInt(process.env.DEFAULT_RETENTION_DAYS || "30", 10),
  complianceJurisdiction: process.env.COMPLIANCE_JURISDICTION || "default",
  nodeEnv: process.env.NODE_ENV || "development",
};

module.exports = config;
