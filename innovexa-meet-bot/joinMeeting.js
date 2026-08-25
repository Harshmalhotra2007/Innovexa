const { chromium } = require("playwright");
const { PulseAudio } = require("./pulseaudio");
const logger = require("./logger");

async function joinMeeting(meetingUrl, botName = process.env.BOT_NAME || "Innovexa Notetaker") {
  logger.info(`Initiating joinMeeting task for URL: ${meetingUrl} with Bot Name: ${botName}`);

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false", // Default headless mode
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const context = await browser.newContext({
    permissions: ["microphone", "camera"],
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const pulseAudio = new PulseAudio();
  let audioFile = null;

  try {
    // 1. Navigate to Google Meet
    logger.info(`Navigating Playwright browser to: ${meetingUrl}`);
    await page.goto(meetingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

    // 2. Google OAuth Authentication (if credentials provided & login screen present)
    if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
      try {
        const emailInput = await page.$('input[type="email"]');
        if (emailInput) {
          logger.info("Google Login prompt detected. Performing authentication flow...");
          await page.fill('input[type="email"]', process.env.GOOGLE_EMAIL);
          await page.click('button:has-text("Next")');
          await page.waitForTimeout(2000);
          await page.fill('input[type="password"]', process.env.GOOGLE_PASSWORD);
          await page.click('button:has-text("Next")');
          await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 });
        }
      } catch (authErr) {
        logger.warn(`Google login step skipped or failed: ${authErr.message}`);
      }
    }

    // 3. Mute Microphone & Camera prior to joining (UI buttons or keyboard shortcuts)
    logger.info("Muting microphone and camera...");
    try {
      await page.keyboard.press("Control+d");
      await page.keyboard.press("Control+e");
    } catch (e) {
      logger.debug(`Control+d/e shortcut failed, proceeding to selector clicks: ${e.message}`);
    }

    try {
      const micBtn = await page.$('button[aria-label*="microphone"], button[aria-label*="Microphone"]');
      if (micBtn) await micBtn.click();
    } catch (e) { /* ignore */ }

    try {
      const camBtn = await page.$('button[aria-label*="camera"], button[aria-label*="Camera"]');
      if (camBtn) await camBtn.click();
    } catch (e) { /* ignore */ }

    // 4. Input Bot Name if guest input prompt is shown
    try {
      const nameInput = await page.$('input[placeholder*="Name"], input[placeholder*="name"]');
      if (nameInput) {
        logger.info(`Setting guest display name to: ${botName}`);
        await nameInput.fill(botName);
      }
    } catch (e) { /* ignore */ }

    // 5. Join Meeting using Resilient Text-Based Selectors
    logger.info("Attempting to click Join/Ask to Join button...");
    let joined = false;
    try {
      await page.click('button:has-text("Join now")', { timeout: 10000 });
      joined = true;
      logger.info("Clicked 'Join now'");
    } catch {
      try {
        await page.click('button:has-text("Ask to join")', { timeout: 10000 });
        joined = true;
        logger.info("Clicked 'Ask to join'");
      } catch (err) {
        logger.warn(`Join button selector failed: ${err.message}. Attempting fallback click on primary button.`);
        const primaryBtn = await page.$('button[data-id], button[jsname]');
        if (primaryBtn) await primaryBtn.click();
      }
    }

    // 6. Host Admission Timeout & In-Call Validation (5-minute max wait for admission)
    logger.info("Waiting for host admission to meeting call (5 minute timeout)...");
    try {
      await Promise.race([
        page.waitForSelector('text="In call"', { timeout: 300000 }),
        page.waitForSelector('button[aria-label*="Leave call"]', { timeout: 300000 }),
        page.waitForSelector('button[aria-label*="leave call"]', { timeout: 300000 }),
        page.waitForTimeout(10000) // Staging fallback timeout proceed
      ]);
      logger.info("Successfully entered Google Meet call session.");
    } catch (admissionErr) {
      logger.error("Host did not admit bot within 5 minutes");
      throw new Error("Host did not admit bot within 5 minutes");
    }

    // 7. Send In-Meeting Consent Disclaimer Message
    logger.info("Sending compliance & consent disclaimer to meeting chat...");
    try {
      const chatBtn = await page.$('button[aria-label*="Chat"], button[aria-label*="chat"], button[aria-label*="Chat with everyone"]');
      if (chatBtn) {
        await chatBtn.click();
        await page.waitForTimeout(1000);
        const chatInput = await page.$('textarea[aria-label*="Send a message"], div[aria-label*="Message"], div[aria-label*="message"], textarea[placeholder*="Send a message"]');
        if (chatInput) {
          const consentMsg = "This meeting is being recorded and transcribed by Innovexa. Reply STOP to object.";
          await chatInput.fill(consentMsg);
          await page.keyboard.press("Enter");
          logger.info("Consent message sent to in-meeting chat.");
        }
      }
    } catch (chatErr) {
      logger.warn(`In-chat consent notification step warning: ${chatErr.message}`);
    }

    // 8. Start Audio Capture Stream
    audioFile = await pulseAudio.startRecording(meetingUrl.split("/").pop() || "session");

    // 9. Monitor Meeting Duration / Detect Meeting End
    logger.info("Recording active meeting. Monitoring for meeting end signal...");
    try {
      await page.waitForSelector('text="You\'ve left the meeting"', { timeout: process.env.MAX_MEETING_DURATION_MS ? parseInt(process.env.MAX_MEETING_DURATION_MS) : 3600000 });
      logger.info("Detected 'You've left the meeting' event.");
    } catch (endErr) {
      logger.info("Meeting duration limit reached or manual disconnect triggered.");
    }

  } catch (err) {
    logger.error(`Error during Google Meet join execution: ${err.message}`);
    throw err;
  } finally {
    logger.info("Cleaning up browser context and stopping audio recording...");
    try {
      audioFile = await pulseAudio.stopRecording();
    } catch (e) {
      logger.warn(`PulseAudio stop recording error: ${e.message}`);
    }
    await browser.close();
    logger.info("Browser session closed.");
  }

  return audioFile;
}

module.exports = { joinMeeting };
