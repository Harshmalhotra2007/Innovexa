const { chromium } = require("playwright");
const { PulseAudio } = require("./pulseaudio");
const logger = require("./logger");

class MeetBot {
  async join(meetingUrl, botName = process.env.BOT_NAME || "Innovexa Notetaker") {
    logger.info("Initiating MeetBot join task", { meetingUrl, botName });

    const pulseAudio = new PulseAudio();
    try {
      await pulseAudio.setupSink();
    } catch (e) {
      logger.warn("PulseAudio sink pre-setup skipped or unavailable:", { error: e.message });
    }

    const launchOptions = {
      headless: process.env.HEADLESS !== "false",
      args: [
        "--use-fake-ui-for-media-stream",
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--mute-audio=false",
      ],
      env: {
        ...process.env,
        PULSE_SERVER: process.env.PULSE_SERVER || "unix:/tmp/pulse-socket/pulse-socket",
        PULSE_SINK: process.env.PULSE_SINK || "MeetSink",
        DISPLAY: process.env.DISPLAY || ":99",
      },
    };

    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    }

    const browser = await chromium.launch(launchOptions);
    this.browser = browser;

    const context = await browser.newContext({
      permissions: ["microphone", "camera"],
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    this.page = page;
    let audioFile = null;

    try {
      logger.info("Navigating to Google Meet URL", { meetingUrl });
      await page.goto(meetingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

      // Wait for Google Meet lobby UI to load instantly
      await page.waitForTimeout(500);

      // 1. Handle guest name input if present
      try {
        const nameSelectors = [
          'input[aria-label*="name" i]',
          'input[placeholder*="name" i]',
          'input[type="text"]'
        ];
        for (const selector of nameSelectors) {
          const input = await page.$(selector);
          if (input && (await input.isVisible().catch(() => false))) {
            await input.fill(botName);
            logger.info("Entered bot name as guest", { botName, selector });
            await page.waitForTimeout(100);
            break;
          }
        }
      } catch (e) {
        logger.debug("Guest name input check skipped", { error: e.message });
      }

      // 2. Mute camera and microphone
      try {
        await page.keyboard.press("Control+d");
        await page.keyboard.press("Control+e");
      } catch (e) { /* ignore */ }

      try {
        const camBtn = page.getByRole("button", { name: /turn off camera/i });
        if (await camBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await camBtn.click().catch(() => {});
        }
      } catch (e) { /* ignore */ }

      try {
        const micBtn = page.getByRole("button", { name: /turn off microphone/i });
        if (await micBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await micBtn.click().catch(() => {});
        }
      } catch (e) { /* ignore */ }

      logger.info("Disabled camera and microphone");

      // 3. Click "Ask to join" or "Join now" with resilient multi-selector retry loop
      let clicked = false;
      const joinSelectors = [
        'button:has-text("Ask to join")',
        'button:has-text("Join now")',
        'button[aria-label*="Ask to join" i]',
        'button[aria-label*="Join now" i]',
        'div[role="button"]:has-text("Ask to join")',
        'div[role="button"]:has-text("Join now")',
        'button[data-id]',
        'button[jsname]'
      ];

      for (let attempt = 0; attempt < 5; attempt++) {
        for (const sel of joinSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && (await btn.isVisible().catch(() => false))) {
              await btn.click({ force: true });
              clicked = true;
              logger.info(`Successfully clicked join button via selector: ${sel}`);
              break;
            }
          } catch (e) { /* ignore */ }
        }
        if (clicked) break;
        await page.waitForTimeout(300);
      }

      if (!clicked) {
        logger.warn("Primary join selectors missed, attempting direct ENTER key press...");
        await page.keyboard.press("Enter");
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

  async leave() {
    logger.info("Explicit leave signal received. Disconnecting bot from Google Meet...");
    try {
      if (this.page && !this.page.isClosed()) {
        const leaveBtn = this.page.getByRole("button", { name: /leave call/i });
        if (await leaveBtn.isVisible().catch(() => false)) {
          await leaveBtn.click().catch(() => {});
        }
        await this.page.close().catch(() => {});
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
      }
    } catch (e) {
      logger.warn("Error during explicit bot leave execution:", { error: e.message });
    }
  }
}

module.exports = { MeetBot };
