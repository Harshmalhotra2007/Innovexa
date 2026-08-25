const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const logger = require("./logger");

async function handoffToPipeline(audioFile, meetingUrl, metadataObj = {}) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || "http://n8n:5678/webhook/innovexa-meeting";
  const botName = process.env.BOT_NAME || "Innovexa Notetaker";

  logger.info(`Initiating pipeline handoff to webhook: ${webhookUrl}`);

  if (!fs.existsSync(audioFile)) {
    throw new Error(`Audio file does not exist for handoff: ${audioFile}`);
  }

  const formData = new FormData();
  formData.append("audio", fs.createReadStream(audioFile));
  formData.append("meetingUrl", meetingUrl);
  formData.append("botName", botName);

  const metadata = JSON.stringify({
    meetingTitle: metadataObj.meetingTitle || `Meeting ${meetingUrl.split("/").pop()}`,
    startTime: metadataObj.startTime || new Date().toISOString(),
    meetingUrl: meetingUrl,
    ...metadataObj,
  });

  formData.append("metadata", metadata);

  try {
    const response = await axios.post(webhookUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000,
    });

    logger.info(`Pipeline handoff successful. Response status: ${response.status}`);
    return { status: "success", webhookStatus: response.status, data: response.data };
  } catch (err) {
    logger.error(`Pipeline handoff webhook failed: ${err.message}`);
    // Return structured payload even on webhook failure so calling API handles clean response
    return { 
      status: "handoff_warning", 
      error: err.message, 
      audioFile,
      metadata: JSON.parse(metadata)
    };
  }
}

module.exports = { handoffToPipeline };
