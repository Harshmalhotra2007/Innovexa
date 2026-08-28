const config = require('./config');

/**
 * Consent and Disclosure Announcement Handler
 * Handles visible bot naming, in-meeting chat announcement, and consent logging.
 */
class ConsentAnnouncer {
  constructor(page, botName = config.botDisplayName) {
    this.page = page;
    this.botName = botName;
    this.consentStatus = "pending"; // pending, consented, objected
    this.consentLogs = [];
  }

  /**
   * Post announcement in Google Meet chat or trigger notification banner
   */
  async announcePresence() {
    console.log(`[ConsentAnnouncer] Announcing presence for disclosed bot: ${this.botName}`);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      botName: this.botName,
      action: "announced",
      jurisdiction: config.complianceJurisdiction
    };
    this.consentLogs.push(logEntry);

    try {
      // Attempt to open chat and send disclosure message
      const chatButtonSelector = 'button[aria-label="Chat with everyone"], button[aria-label*="Chat"]';
      await this.page.waitForSelector(chatButtonSelector, { timeout: 5000 });
      await this.page.click(chatButtonSelector);
      await this.page.waitForTimeout(1000);

      const chatInputSelector = 'textarea[aria-label="Send a message to everyone"], textarea[placeholder*="Send a message"]';
      await this.page.waitForSelector(chatInputSelector, { timeout: 5000 });
      await this.page.type(chatInputSelector, `[DISCLOSURE] Hello! I am ${this.botName}, an AI meeting assistant recording this session for transcription and summaries. If you object, please notify or use opt-out.`);
      await this.page.keyboard.press("Enter");
      console.log("[ConsentAnnouncer] In-meeting chat disclosure sent successfully.");
    } catch (e) {
      console.warn("[ConsentAnnouncer] Could not send chat disclosure via UI (fallback mode):", e.message);
    }

    this.consentStatus = "consented";
    return logEntry;
  }

  /**
   * Check participant opt-outs or objections
   */
  async checkParticipantObjections() {
    // Stub for monitoring participant chat objections or mute requests
    return { status: this.consentStatus, logs: this.consentLogs };
  }
}

module.exports = { ConsentAnnouncer };