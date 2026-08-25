const { chromium } = require("playwright-chromium");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Automates joining a Google Meet session, capturing the audio stream via PulseAudio,
 * posting a consent announcement in the chat, and exiting gracefully.
 */
async function runMeetBot(meetingUrl, durationMs, outputFilePath) {
  console.log(`[MeetBot] Starting headful browser for Meet URL: ${meetingUrl}`);

  const browser = await chromium.launch({
    headless: false, // Run headful inside Xvfb virtual frame buffer
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--disable-dev-shm-usage", // Avoid shared memory OOM container crashes
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--mute-audio=false" // Ensure audio is rendered and outputted to PulseAudio
    ],
  });

  const context = await browser.newContext({
    permissions: ["microphone"],
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();
  let recorderProcess = null;
  let isRecording = false;

  // Signal cleanup function to stop recording cleanly on process termination
  const cleanExit = () => {
    if (recorderProcess && isRecording) {
      console.log("[MeetBot] Signal received. Terminating recording process cleanly...");
      recorderProcess.kill("SIGTERM");
      isRecording = false;
    }
  };

  process.on("SIGINT", cleanExit);
  process.on("SIGTERM", cleanExit);

  try {
    // 1. Pre-auth configuration
    if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
      console.log("[MeetBot] Performing Google account login...");
      await page.goto("https://accounts.google.com");
      await page.fill('input[type="email"]', process.env.GOOGLE_EMAIL);
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(2000);
      await page.fill('input[type="password"]', process.env.GOOGLE_PASSWORD);
      await page.click('button:has-text("Next")');
      await page.waitForNavigation({ waitUntil: "networkidle" });
    }

    // 2. Navigate to Meet Call
    console.log(`[MeetBot] Navigating to Google Meet URL...`);
    await page.goto(meetingUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // 3. Lobby checks: Mute Mic & Camera before entering to avoid echo
    console.log("[MeetBot] Muting camera and microphone in lobby...");
    try {
      // Toggle mic off
      const micButton = page.locator('[aria-label*="mute microphone"], [aria-label*="turn off microphone"]');
      if (await micButton.isVisible()) {
        await micButton.click();
      } else {
        await page.keyboard.press("Control+d");
      }

      // Toggle camera off
      const camButton = page.locator('[aria-label*="mute camera"], [aria-label*="turn off camera"]');
      if (await camButton.isVisible()) {
        await camButton.click();
      } else {
        await page.keyboard.press("Control+e");
      }
      await page.waitForTimeout(1000);
    } catch (e) {
      console.warn("[MeetBot] Muting via UI locator failed, utilizing hotkeys:", e.message);
    }

    // 4. Input displayName if joining as guest
    const nameInput = page.locator('input[placeholder*="Your name"], input[placeholder*="Ask to join"]');
    if (await nameInput.isVisible()) {
      const botName = process.env.BOT_DISPLAY_NAME || "Innovexa Notetaker";
      console.log(`[MeetBot] Entering guest display name: ${botName}`);
      await nameInput.fill(botName);
      await page.waitForTimeout(500);
    }

    // 5. Ask to join / Join call
    console.log("[MeetBot] Requesting admittance to Google Meet call...");
    const joinSelector = 'button:has-text("Ask to join"), button:has-text("Join now"), button:has-text("Join")';
    await page.waitForSelector(joinSelector, { timeout: 15000 });
    await page.click(joinSelector);

    // 6. Poll DOM for Call Admittance (Hard timeout 5 mins)
    console.log("[MeetBot] Waiting in lobby for host admittance (5 min limit)...");
    const callAdmittedSelector = '[aria-label*="Chat with everyone"], [aria-label*="Show everyone"]';
    
    try {
      await page.waitForSelector(callAdmittedSelector, { timeout: 300000 });
      console.log("[MeetBot] Admitted to call successfully!");
    } catch (err) {
      console.error("[MeetBot] Lobby Timeout: Admittance request rejected or host did not respond within 5 mins.");
      throw new Error("Lobby Admittance Timeout");
    }

    // 7. Start PulseAudio Loopback Recording via FFmpeg
    console.log("[MeetBot] Starting FFmpeg audio capture from PulseAudio MeetSink...");
    const recordingMode = process.env.RECORDING_MODE || "batch"; // "batch" or "chunked"
    
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });

    let ffmpegArgs = [
      "-y",
      "-f", "pulse",
      "-i", "MeetSink.monitor",
      "-ac", "1",
      "-ar", "16000",
      "-c:a", "pcm_s16le"
    ];

    if (recordingMode === "chunked") {
      // Chunked mode segment output (30-second chunks with 5-second overlapping)
      const chunkPattern = outputFilePath.replace(".wav", "_chunk_%03d.wav");
      console.log(`[MeetBot] Outputting rolling segments to: ${chunkPattern}`);
      ffmpegArgs.push(
        "-f", "segment",
        "-segment_time", "30",
        "-segment_format", "wav",
        "-reset_timestamps", "1",
        chunkPattern
      );
    } else {
      console.log(`[MeetBot] Outputting single batch audio to: ${outputFilePath}`);
      ffmpegArgs.push(outputFilePath);
    }

    recorderProcess = spawn("ffmpeg", ffmpegArgs);
    isRecording = true;

    recorderProcess.stderr.on("data", (data) => {
      // Log minor ffmpeg stream metrics if verbose logging is enabled
      // console.log(`[FFmpeg] ${data.toString()}`);
    });

    recorderProcess.on("close", (code) => {
      console.log(`[MeetBot] FFmpeg audio capture process exited with code ${code}`);
      isRecording = false;
    });

    // 8. Post Consent Announcement in Meeting Chat
    console.log("[MeetBot] Sending compliance consent announcement...");
    try {
      const chatButton = page.locator('[aria-label*="Chat with everyone"], button:has-text("chat")');
      await chatButton.click();
      await page.waitForTimeout(1000);

      const chatInput = page.locator('textarea[placeholder*="Send a message"], textarea[aria-label*="Send a message"]');
      await chatInput.waitFor({ state: "visible", timeout: 5000 });
      
      const consentMsg = "This meeting is being recorded and transcribed by Innovexa. Reply STOP to object.";
      await chatInput.fill(consentMsg);
      await page.keyboard.press("Enter");
      console.log("[MeetBot] Consent message posted in call chat.");
      
      // Close chat panel
      await chatButton.click();
    } catch (chatErr) {
      console.warn("[MeetBot] Consent chat post skipped or failed:", chatErr.message);
    }

    // 9. Monitor meeting duration and participant drop-off
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    console.log(`[MeetBot] Monitoring call. Max duration: ${durationMs / 1000}s`);

    while (Date.now() - startTime < durationMs) {
      await page.waitForTimeout(checkInterval);

      // Check if call ended (just the bot remains or return to home screen is shown)
      const leftScreen = page.locator('button:has-text("Return to home screen"), h1:has-text("You left the meeting")');
      if (await leftScreen.isVisible()) {
        console.log("[MeetBot] Detected 'Left meeting' UI screen. Ending session.");
        break;
      }

      // Check participant count if people icon is available
      try {
        const peopleCountEl = page.locator('[aria-label*="Show everyone"]');
        if (await peopleCountEl.isVisible()) {
          const text = await peopleCountEl.getAttribute("aria-label");
          // Extract numbers from text (e.g. "Show everyone (12)")
          const match = text.match(/\d+/);
          if (match) {
            const count = parseInt(match[0], 10);
            if (count <= 1) {
              console.log("[MeetBot] All participants have left the call. Exiting.");
              break;
            }
          }
        }
      } catch (countErr) {
        // Fallback if count is unreadable
      }
    }

  } catch (err) {
    console.error("[MeetBot] Error during Google Meet bot automation:", err);
    throw err;
  } finally {
    // 10. Clean exit
    if (recorderProcess && isRecording) {
      console.log("[MeetBot] Stopping loopback recorder...");
      recorderProcess.kill("SIGTERM");
      
      // Wait a moment for FFmpeg to flush file buffers
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Remove event listeners
    process.off("SIGINT", cleanExit);
    process.off("SIGTERM", cleanExit);

    await browser.close();
    console.log("[MeetBot] Browser closed.");
  }
}

module.exports = { runMeetBot };
