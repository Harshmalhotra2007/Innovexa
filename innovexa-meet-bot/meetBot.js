const { chromium } = require("playwright");
const { PulseAudio } = require("./pulseaudio");
const logger = require("./logger");

class MeetBot {
  async join(meetingUrl, botName = process.env.BOT_NAME || "Innovexa Notetaker") {
    logger.info("Initiating MeetBot join task", { meetingUrl, botName });

    const launchOptions = {
      headless: process.env.HEADLESS !== "false",
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    };

    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    }

    const browser = await chromium.launch(launchOptions);

    const context = await browser.newContext({
      permissions: ["microphone", "camera"],
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    const pulseAudio = new PulseAudio();
    let audioFile = null;

    try {
      logger.info("Navigating to Google Meet URL", { meetingUrl });
      await page.goto(meetingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

      // Handle guest name input if present
      try {
        const guestInput = page.getByRole("textbox", { name: /your name/i });
        if (await guestInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await guestInput.fill(botName);
          logger.info("Entered bot name as guest", { botName });
        }
      } catch (e) {
        logger.debug("Guest name input check skipped", { error: e.message });
      }

      // Turn off camera and mic using ARIA role selectors or keyboard shortcuts
      try {
        await page.keyboard.press("Control+d");
        await page.keyboard.press("Control+e");
      } catch (e) { /* ignore */ }

      try {
        const camBtn = page.getByRole("button", { name: /turn off camera/i });
        if (await camBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await camBtn.click();
        }
      } catch (e) { /* ignore */ }

      try {
        const micBtn = page.getByRole("button", { name: /turn off microphone/i });
        if (await micBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await micBtn.click();
        }
      } catch (e) { /* ignore */ }

      logger.info("Disabled camera and microphone");

      // Click "Ask to join" or "Join now" using ARIA role selector
      try {
        const joinBtn = page.getByRole("button", { name: /ask to join|join now/i });
        await joinBtn.click({ timeout: 10000 });
        logger.info("Clicked join button via ARIA role selector");
      } catch (err) {
        logger.warn("Role-based join button click failed, attempting text selector fallback", { error: err.message });
        const fallbackBtn = await page.$('button:has-text("Join now"), button:has-text("Ask to join")');
        if (fallbackBtn) await fallbackBtn.click();
      }

      // Wait for admission
      await this.waitForAdmission(page);
      logger.info("Bot admitted to meeting call");

      // Send consent message
      await this.sendConsentMessage(page);
      logger.info("Sent in-chat consent message");

      // Start audio capture
      const meetingId = meetingUrl.split("/").pop() || "session";
      audioFile = await pulseAudio.startRecording(meetingId);
      logger.info("Started audio recording", { audioFile });

      // Detect meeting end
      await this.waitForMeetingEnd(page);

    } catch (err) {
      logger.error("MeetBot execution error", { error: err.message, meetingUrl });
      throw err;
    } finally {
      logger.info("Stopping PulseAudio recording and closing browser...");
      try {
        audioFile = await pulseAudio.stopRecording();
      } catch (e) {
        logger.warn("PulseAudio stop recording error", { error: e.message });
      }
      await browser.close();
      logger.info("Browser session closed.");
    }

    return audioFile;
  }

  async waitForAdmission(page, timeoutMs = 5 * 60 * 1000) {
    const start = Date.now();
    logger.info("Waiting for host admission to meeting call...");
    while (Date.now() - start < timeoutMs) {
      const inCall = await page.getByText(/you're presenting|leave call/i).isVisible().catch(() => false);
      if (inCall) return true;
      const leaveBtn = page.getByRole("button", { name: /leave call/i });
      if (await leaveBtn.isVisible().catch(() => false)) return true;
      await page.waitForTimeout(3000);
    }
    throw new Error("Host did not admit bot within timeout");
  }

  async sendConsentMessage(page) {
    try {
      const chatBtn = page.getByRole("button", { name: /chat/i });
      if (await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await chatBtn.click();
        await page.waitForTimeout(1000);
        const chatInput = page.getByRole("textbox", { name: /send a message/i });
        if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          const consentMsg = "This meeting is being recorded and transcribed by Innovexa. Reply STOP to object.";
          await chatInput.fill(consentMsg);
          await page.keyboard.press("Enter");
          logger.info("Sent consent message to meeting chat");
        }
      }
    } catch (e) {
      logger.warn("Send consent message step skipped", { error: e.message });
    }
  }

  async waitForMeetingEnd(page) {
    try {
      const maxDuration = process.env.MAX_MEETING_DURATION_MS 
        ? parseInt(process.env.MAX_MEETING_DURATION_MS) 
        : 3600000;
      await page.waitForSelector('text="You left the meeting"', { timeout: maxDuration });
      logger.info("Meeting end detected ('You left the meeting')");
    } catch (e) {
      logger.info("Meeting wait limit reached or manual disconnect triggered");
    }
  }
}

module.exports = { MeetBot };
