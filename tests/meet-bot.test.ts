const path = require("path");
const fs = require("fs");

// Mock dependencies before importing modules
jest.mock("../innovexa-meet-bot/meetBot", () => {
  return {
    MeetBot: jest.fn().mockImplementation(() => ({
      join: jest.fn().mockImplementation(async (meetingUrl, botName) => {
        if (!meetingUrl || meetingUrl.includes("fail")) {
          throw new Error("Failed to join meeting");
        }
        const mockFile = path.join(__dirname, "../scratch/test_recording.wav");
        fs.mkdirSync(path.dirname(mockFile), { recursive: true });
        fs.writeFileSync(mockFile, Buffer.from("RIFF....WAVEfmt...data...mock"));
        return mockFile;
      }),
      waitForAdmission: jest.fn().mockResolvedValue(true),
      sendConsentMessage: jest.fn().mockResolvedValue(true),
      waitForMeetingEnd: jest.fn().mockResolvedValue(true),
    })),
  };
});

jest.mock("../innovexa-meet-bot/handoff", () => ({
  handoffToPipeline: jest.fn().mockImplementation(async (audioFile, meetingUrl, metadata) => {
    return {
      status: "success",
      webhookStatus: 200,
      data: { received: true, meetingUrl },
    };
  }),
}));

const server = require("../innovexa-meet-bot/server");
const { PulseAudio } = require("../innovexa-meet-bot/pulseaudio");
const { MeetBot } = require("../innovexa-meet-bot/meetBot");

describe("Operation Ghost Caller Full Stack - Meet Bot Service Tests", () => {
  let baseUrl: any;
  let testServer: any;

  beforeAll((done) => {
    testServer = server.listen(0, () => {
      const port = testServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (testServer && testServer.close) {
      testServer.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("MeetBot Class Structure", () => {
    it("should instantiate MeetBot class and expose expected methods", () => {
      const bot = new MeetBot();
      expect(bot).toBeDefined();
      expect(typeof bot.join).toBe("function");
      expect(typeof bot.waitForAdmission).toBe("function");
      expect(typeof bot.sendConsentMessage).toBe("function");
      expect(typeof bot.waitForMeetingEnd).toBe("function");
    });
  });

  describe("GET /health", () => {
    it("should return 200 OK and healthy status", async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe("healthy");
      expect(body.service).toBe("innovexa-meet-bot");
    });
  });

  describe("POST /bot/join", () => {
    it("should return 400 Bad Request if meetingUrl is missing", async () => {
      const res = await fetch(`${baseUrl}/bot/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error).toContain("Missing required parameter: meetingUrl");
    });

    it("should execute join, recording, and handoff successfully for valid meetingUrl", async () => {
      const res = await fetch(`${baseUrl}/bot/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingUrl: "https://meet.google.com/abc-defg-hij",
          botName: "Test Bot",
          metadata: { meetingTitle: "Sprint Sync" },
        }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe("success");
      expect(body.meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
      expect(body.botName).toBe("Test Bot");
      expect(body.handoff.status).toBe("success");
    });

    it("should handle error gracefully when MeetBot join throws an exception", async () => {
      const res = await fetch(`${baseUrl}/bot/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingUrl: "https://meet.google.com/fail-meeting",
        }),
      });
      const body = await res.json();
      expect(res.status).toBe(500);
      expect(body.status).toBe("error");
      expect(body.error).toContain("Failed to join meeting");
    });
  });

  describe("PulseAudio Engine Unit Verification", () => {
    it("should instantiate PulseAudio and create failsafe WAV header", async () => {
      const scratchDir = path.join(__dirname, "../scratch");
      const pa = new PulseAudio(scratchDir);
      expect(pa).toBeDefined();

      pa.audioFile = path.join(scratchDir, "failsafe_test.wav");
      pa.writeFailsafeWavHeader();

      expect(fs.existsSync(pa.audioFile)).toBe(true);
      const stat = fs.statSync(pa.audioFile);
      expect(stat.size).toBeGreaterThanOrEqual(44); // Standard WAV header size

      // Clean up
      fs.unlinkSync(pa.audioFile);
    });
  });
});
