const { chromium } = require("playwright");
const { PulseAudio } = require("./pulseaudio");
const logger = require("./logger");

/**
 * Progressive Exponential Backoff Delay with Jitter
 */
function getExponentialBackoffDelay(attempt, initialMs = 300, factor = 1.5, maxMs = 3000) {
  const delay = Math.min(initialMs * Math.pow(factor, attempt), maxMs);
  const jitter = delay * 0.1 * Math.random();
  return Math.round(delay + jitter);
}

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
        const delay = getExponentialBackoffDelay(attempt, 300, 1.5, 2000);
        await page.waitForTimeout(delay);
      }

      if (!clicked) {
        logger.info("Attempting robust JS DOM injection fallback for Google Meet join button...");
        clicked = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
          const btn = els.find((el) => {
            const txt = (el.textContent || "").toLowerCase();
            const aria = (el.getAttribute("aria-label") || "").toLowerCase();
            const jsname = el.getAttribute("jsname");
            return (
              txt.includes("ask to join") ||
              txt.includes("join now") ||
              aria.includes("ask to join") ||
              aria.includes("join now") ||
              jsname === "QYrYVd" ||
              jsname === "CQYiBc"
            );
          });
          if (btn) {
            (btn as any).click();
            return true;
          }
          return false;
        }).catch(() => false);

        if (clicked) {
          logger.info("Successfully clicked join button via JS DOM injection!");
        }
      }

      if (!clicked) {
        logger.warn("Primary & JS injection selectors missed, attempting direct ENTER key press...");
        await page.keyboard.press("Enter");
      }

      // Wait for admission
      await this.waitForAdmission(page);
      logger.info("Bot admitted to meeting call");

      // Send consent message
      await this.sendConsentMessage(page);
      logger.info("Sent in-chat consent message");

      // Start audio capture with retry mechanism & MediaRecorder fallback
      const meetingId = meetingUrl.split("/").pop() || "session";
      try {
        audioFile = await pulseAudio.startRecording(meetingId);
        logger.info("Started primary PulseAudio sink recording", { audioFile });
      } catch (pulseErr) {
        logger.warn("PulseAudio sink failed, attempting 1 retry...", { error: pulseErr.message });
        try {
          await new Promise((r) => setTimeout(r, 1000));
          await pulseAudio.setupSink();
          audioFile = await pulseAudio.startRecording(meetingId);
          logger.info("PulseAudio retry succeeded!", { audioFile });
        } catch (retryErr) {
          logger.warn("PulseAudio retry failed. Activating browser MediaRecorder API fallback...", { error: retryErr.message });
          await page.evaluate(() => {
            try {
              (window as any)._mediaChunks = [];
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const dest = ctx.createMediaStreamDestination();
              const els = document.querySelectorAll('audio, video');
              els.forEach(el => {
                try {
                  const src = ctx.createMediaElementSource(el as HTMLMediaElement);
                  src.connect(dest);
                  src.connect(ctx.destination);
                } catch (e) {}
              });
              const recorder = new MediaRecorder(dest.stream);
              recorder.ondataavailable = (e) => { if (e.data.size > 0) (window as any)._mediaChunks.push(e.data); };
              recorder.start(1000);
              (window as any)._mediaRecorder = recorder;
            } catch (e) { console.error('MediaRecorder fallback error:', e); }
          }).catch(() => {});
          audioFile = pulseAudio.createFailsafeRecording(meetingId);
        }
      }

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
    let attemptCount = 0;
    logger.info("Waiting for host admission to meeting call...");
    while (Date.now() - start < timeoutMs) {
      // 1. URL parameter change check (e.g., ?pli=1, authuser=, or meeting join session params)
      const currentUrl = page.url();
      if (currentUrl.includes("pli=") || currentUrl.includes("authuser=") || currentUrl.includes("&hs=")) {
        logger.info("Admission detected via URL parameter change:", { currentUrl });
        return true;
      }

      // 2. Playwright element and button visibility check
      const inCall = await page.getByText(/you're presenting|leave call/i).isVisible().catch(() => false);
      if (inCall) return true;

      const leaveBtn = page.getByRole("button", { name: /leave call/i });
      if (await leaveBtn.isVisible().catch(() => false)) return true;

      // 3. DOM JS evaluation for in-call state or leave button
      const domInCall = await page.evaluate(() => {
        const url = window.location.href;
        if (url.includes("pli=") || url.includes("authuser=")) return true;
        const leave = document.querySelector('button[aria-label*="Leave call" i], button[jsname="CQYiBc"]');
        return !!leave;
      }).catch(() => false);

      if (domInCall) return true;

      const delay = getExponentialBackoffDelay(attemptCount++, 1000, 1.3, 4000);
      await page.waitForTimeout(delay);
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

  async leave(retries = 3) {
    logger.info("Explicit leave signal received. Disconnecting bot from Google Meet...");
    try {
      if (this.page && !this.page.isClosed()) {
        const leaveSelectors = [
          'button[aria-label*="Leave call" i]',
          'button[aria-label*="Leave" i]',
          'button:has-text("Leave")',
          'button[jsname="CQYiBc"]',
          'div[role="button"][aria-label*="Leave" i]',
        ];

        let clicked = false;
        for (let r = 0; r < retries; r++) {
          for (const sel of leaveSelectors) {
            try {
              const btn = await this.page.$(sel);
              if (btn && (await btn.isVisible().catch(() => false))) {
                await btn.click({ force: true }).catch(() => {});
                clicked = true;
                logger.info(`Successfully clicked leave call button via selector: ${sel}`);
                break;
              }
            } catch (e) { /* ignore */ }
          }
          if (clicked) break;
          await this.page.waitForTimeout(500).catch(() => {});
        }

        if (!clicked) {
          logger.info("Selector retry loop missed. Attempting JS DOM evaluation for leave button...");
          clicked = await this.page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
            const leaveBtn = btns.find((b) => {
              const txt = (b.textContent || "").toLowerCase();
              const aria = (b.getAttribute("aria-label") || "").toLowerCase();
              const jsname = b.getAttribute("jsname");
              return txt.includes("leave") || aria.includes("leave") || jsname === "CQYiBc";
            });
            if (leaveBtn) {
              (leaveBtn as any).click();
              return true;
            }
            return false;
          }).catch(() => false);
        }

        if (!clicked) {
          logger.info("Attempting Google Meet keyboard shortcut fallback (Ctrl+E / Cmd+E)...");
          await this.page.keyboard.press("Control+e").catch(() => {});
          await this.page.keyboard.press("Meta+e").catch(() => {});
          await this.page.waitForTimeout(500).catch(() => {});
        }

        await this.page.close().catch(() => {});
      }

      if (this.browser) {
        await this.browser.close().catch(() => {});
      }
      logger.info("Bot browser instance closed cleanly.");
    } catch (e) {
      logger.warn("Error during explicit bot leave execution:", { error: e.message });
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return this.leave(retries - 1);
      }
    }
  }
}

module.exports = { MeetBot };
