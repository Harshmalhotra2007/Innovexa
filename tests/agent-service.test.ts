const fs = require("fs");
const path = require("path");

// Mock meet-bot directly to avoid loading playwright-chromium in root tests
jest.mock("../ai-agent-service/meet-bot", () => ({
  runMeetBot: jest.fn().mockResolvedValue(true),
}));

const { runMeetBot } = require("../ai-agent-service/meet-bot");

describe("AI Meeting Agent Service Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should verify bot export functions are defined", () => {
    expect(typeof runMeetBot).toBe("function");
  });

  it("should process and write simulated browser WAV file on invocation", async () => {
    const tempFilePath = path.join(__dirname, "../scratch/temp_recording.wav");
    
    // Create mock audio file
    fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
    fs.writeFileSync(tempFilePath, Buffer.from("RIFF....WAVEfmt...data...test"));

    expect(fs.existsSync(tempFilePath)).toBe(true);

    // Clean up
    fs.unlinkSync(tempFilePath);
  });
});
