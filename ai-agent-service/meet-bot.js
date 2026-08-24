const { chromium } = require("playwright-chromium");
const fs = require("fs");
const path = require("path");

/**
 * Automates joining a Google Meet session, capturing audio stream, and saving it.
 */
async function runMeetBot(meetingUrl, durationMs, outputFilePath) {
  console.log(`[MeetBot] Starting browser for Meet URL: ${meetingUrl}`);
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--allow-file-access-from-files",
    ],
  });

  const context = await browser.newContext({
    permissions: ["microphone"],
  });

  const page = await context.newPage();

  try {
    // 1. Optional Sign In Flow
    if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
      console.log("[MeetBot] Logging in to Google Account...");
      await page.goto("https://accounts.google.com");
      await page.fill('input[type="email"]', process.env.GOOGLE_EMAIL);
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(2000);
      await page.fill('input[type="password"]', process.env.GOOGLE_PASSWORD);
      await page.click('button:has-text("Next")');
      await page.waitForNavigation({ waitUntil: "networkidle" });
    }

    // 2. Navigate to Google Meet
    console.log(`[MeetBot] Navigating to meeting URL...`);
    await page.goto(meetingUrl, { waitUntil: "networkidle" });

    // 3. Disable camera and mic to prevent echo/interference in the lobby
    console.log("[MeetBot] Muting camera and mic in lobby...");
    try {
      await page.keyboard.press("Control+e"); // Mute camera keyboard shortcut
      await page.keyboard.press("Control+d"); // Mute microphone keyboard shortcut
      await page.waitForTimeout(1000);
    } catch (e) {
      console.warn("[MeetBot] Keyboard shortcuts failed, proceeding with UI click fallback:", e);
    }

    // 4. Click Join now button
    console.log("[MeetBot] Clicking 'Join now'...");
    const joinSelector = 'button:has-text("Join now"), button:has-text("Ask to join")';
    await page.waitForSelector(joinSelector, { timeout: 15000 });
    await page.click(joinSelector);

    // 5. Wait for admittance and record audio from the page context
    console.log(`[MeetBot] Joined successfully. Recording audio for ${durationMs / 1000}s...`);

    const audioBase64 = await page.evaluate((duration) => {
      return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            
            mediaRecorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                chunks.push(e.data);
              }
            };
            
            mediaRecorder.onstop = () => {
              const blob = new Blob(chunks, { type: "audio/wav" });
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64data = reader.result.split(",")[1];
                resolve(base64data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            };

            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), duration);
          })
          .catch((err) => reject(err.message));
      });
    }, durationMs);

    // Write base64 audio to file
    const audioBuffer = Buffer.from(audioBase64, "base64");
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    fs.writeFileSync(outputFilePath, audioBuffer);
    console.log(`[MeetBot] Recording saved to: ${outputFilePath}`);

  } catch (err) {
    console.error("[MeetBot] Automated Google Meet interaction error:", err);
    throw err;
  } finally {
    await browser.close();
    console.log("[MeetBot] Browser closed.");
  }
}

module.exports = { runMeetBot };
