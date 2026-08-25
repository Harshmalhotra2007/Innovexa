const { chromium } = require("playwright");
const { PulseAudio } = require("./pulseaudio");
const logger = require("./logger");

/**
 * Autonomously joins a Google Meet call, handles muting, and captures call audio.
 */
async function joinMeeting(meetingUrl, botName = process.env.BOT_NAME || "Innovexa Notetaker") {
  logger.info(`Initiating joinMeeting task for URL: ${meetingUrl} with Bot Name: ${botName}`);

  // Launch Chromium headful inside the Xvfb virtual frame buffer
  const browser = await chromium.launch({
    headless: false, 
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--disable-dev-shm-usage", // Prevent shared memory OOM container crashes
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--mute-audio=false" // Ensure browser plays back meeting audio
    ],
    env: {
      ...process.env,
      PULSE_SERVER: process.env.PULSE_SERVER || "unix:/tmp/pulse-socket/pulse-socket",
      PULSE_SINK: process.env.PULSE_SINK || "MeetSink",
      DISPLAY: process.env.DISPLAY || ":99"
    }
  });

  const context = await browser.newContext({
    permissions: ["microphone"],
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const pulseAudio = new PulseAudio();
  let audioFile = null;
  let isRecording = false;

  // Signal handlers for graceful cleanup of child recorder processes
  const handleTermination = async () => {
    logger.info("[MeetBot] Termination signal caught. Initiating clean recording shutdown...");
    try {
      await pulseAudio.stopRecording();
    } catch (e) {
      logger.warn(`Error stopping PulseAudio during termination: ${e.message}`);
    }
    await browser.close();
    process.exit(0);
  };

  process.on("SIGINT", handleTermination);
  process.on("SIGTERM", handleTermination);

  try {
    // 1. Navigate to Google Meet
    logger.info(`Navigating Playwright browser to: ${meetingUrl}`);
    await page.goto(meetingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);

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

    // 3. Mute Microphone & Camera prior to joining (Lobby)
    logger.info("Muting microphone and camera in lobby...");
    try {
      await page.keyboard.press("Control+d");
      await page.keyboard.press("Control+e");
      await page.waitForTimeout(1000);
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
        await page.waitForTimeout(500);
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
        logger.warn(`Join button selectors failed: ${err.message}. Attempting primary button fallback.`);
        const primaryBtn = await page.$('button[data-id], button[jsname]');
        if (primaryBtn) {
          await primaryBtn.click();
          joined = true;
        }
      }
    }

    if (!joined) {
      throw new Error("Could not find any join buttons on Meet page");
    }

    // 6. Host Admission Timeout & In-Call Validation (5-minute max wait for admission)
    logger.info("Waiting for host admission to meeting call (5 minute timeout)...");
    const callAdmittedSelector = '[aria-label*="Chat with everyone"], [aria-label*="Show everyone"]';
    try {
      await page.waitForSelector(callAdmittedSelector, { timeout: 300000 });
      logger.info("Successfully entered Google Meet call session.");
    } catch (admissionErr) {
      logger.error("Host did not admit bot within 5 minutes. Raising timeout alert.");
      throw new Error("Lobby Admission Timeout (5 Minutes Exceeded)");
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
        // Close chat drawer
        await chatBtn.click();
      }
    } catch (chatErr) {
      logger.warn(`In-chat consent notification step warning: ${chatErr.message}`);
    }

    // 8. Start Audio Capture Stream
    const sessionId = meetingUrl.split("/").pop() || "session";
    audioFile = await pulseAudio.startRecording(sessionId);
    isRecording = true;

    // 9. Monitor Meeting Duration / Detect Meeting End
    logger.info("Recording active meeting. Monitoring for meeting end signal...");
    const maxDuration = process.env.MAX_MEETING_DURATION_MS 
      ? parseInt(process.env.MAX_MEETING_DURATION_MS, 10) 
      : 3600000;
    
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    while (Date.now() - startTime < maxDuration) {
      await page.waitForTimeout(checkInterval);

      // Check if bot was disconnected/left screen shown
      const leftScreen = await page.$('button:has-text("Return to home screen"), h1:has-text("You left the meeting")');
      if (leftScreen) {
        logger.info("Detected 'You've left the meeting' screen. Exiting session.");
        break;
      }

      // Check if everyone else left (participant count <= 1)
      try {
        const peopleCountEl = await page.$('[aria-label*="Show everyone"]');
        if (peopleCountEl) {
          const text = await peopleCountEl.getAttribute("aria-label");
          const match = text.match(/\d+/);
          if (match) {
            const count = parseInt(match[0], 10);
            if (count <= 1) {
              logger.info("All other participants have left the call. Exiting session.");
              break;
            }
          }
        }
      } catch (countErr) {
        // Ignore unreadable count attributes
      }
    }

  } catch (err) {
    logger.error(`Error during Google Meet join execution: ${err.message}`);
    throw err;
  } finally {
    logger.info("Cleaning up browser context and stopping audio recording...");
    try {
      if (isRecording) {
        audioFile = await pulseAudio.stopRecording();
      }
    } catch (e) {
      logger.warn(`PulseAudio stop recording error: ${e.message}`);
    }

    // Unbind signal listeners
    process.off("SIGINT", handleTermination);
    process.off("SIGTERM", handleTermination);

    await browser.close();
    logger.info("Browser session closed.");
  }

  return audioFile;
}

module.exports = { joinMeeting };
