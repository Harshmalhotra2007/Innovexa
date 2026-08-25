const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

class PulseAudio {
  constructor(outputDir = "/recordings") {
    this.outputDir = path.isAbsolute(outputDir) 
      ? outputDir 
      : path.join(__dirname, outputDir);
    this.sinkName = null;
    this.moduleIndex = null;
    this.recordingProcess = null;
    this.audioFile = null;
  }

  async execAsync(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        resolve(stdout.trim());
      });
    });
  }

  async setupSink() {
    this.sinkName = `innovexa_sink_${Date.now()}`;
    try {
      logger.info(`Setting up PulseAudio null-sink: ${this.sinkName}`);
      const stdout = await this.execAsync(`pactl load-module module-null-sink sink_name=${this.sinkName}`);
      this.moduleIndex = stdout;
      await this.execAsync(`pactl set-default-sink ${this.sinkName}`);
      logger.info(`PulseAudio null-sink configured successfully. Module ID: ${this.moduleIndex}`);
    } catch (err) {
      logger.warn(`PulseAudio pactl setup warning (using default system audio stream if null-sink fails): ${err.message}`);
    }
  }

  async startRecording(meetingId = "session") {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    await this.setupSink();

    const fileName = `recording_${meetingId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.wav`;
    this.audioFile = path.join(this.outputDir, fileName);

    logger.info(`Starting audio capture to file: ${this.audioFile}`);

    const monitorSource = this.sinkName ? `${this.sinkName}.monitor` : "default";

    // Attempt FFmpeg recording (Primary)
    try {
      const ffmpegArgs = [
        "-y",
        "-f", "pulse",
        "-i", monitorSource,
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",
        this.audioFile
      ];

      this.recordingProcess = spawn("ffmpeg", ffmpegArgs);

      this.recordingProcess.stderr.on("data", (data) => {
        logger.debug(`[FFmpeg] ${data.toString()}`);
      });

      this.recordingProcess.on("error", (err) => {
        logger.warn(`FFmpeg process error: ${err.message}. Trying parec fallback...`);
        this.startParecFallback(monitorSource);
      });

      logger.info(`FFmpeg recording spawned successfully.`);
    } catch (err) {
      logger.warn(`FFmpeg spawn exception: ${err.message}. Initializing parec fallback...`);
      this.startParecFallback(monitorSource);
    }

    return this.audioFile;
  }

  startParecFallback(monitorSource) {
    try {
      const parecCmd = `parec --format=s16le --rate=16000 --channels=1 --device=${monitorSource} | ffmpeg -y -f s16le -ar 16000 -ac 1 -i - ${this.audioFile}`;
      this.recordingProcess = exec(parecCmd);
      logger.info(`parec fallback recording initiated.`);
    } catch (err) {
      logger.error(`parec fallback failed: ${err.message}`);
      // Write placeholder valid WAV header file as absolute failsafe
      this.writeFailsafeWavHeader();
    }
  }

  writeFailsafeWavHeader() {
    try {
      const header = Buffer.alloc(44);
      header.write("RIFF", 0);
      header.writeUInt32LE(36, 4);
      header.write("WAVE", 8);
      header.write("fmt ", 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20); // PCM
      header.writeUInt16LE(1, 22); // Mono
      header.writeUInt32LE(16000, 24); // Sample rate 16000
      header.writeUInt32LE(32000, 28); // Byte rate
      header.writeUInt16LE(2, 32); // Block align
      header.writeUInt16LE(16, 34); // Bits per sample
      header.write("data", 36);
      header.writeUInt32LE(0, 40);
      fs.writeFileSync(this.audioFile, header);
      logger.info(`Failsafe WAV file header created at: ${this.audioFile}`);
    } catch (e) {
      logger.error(`Failsafe WAV write failed: ${e.message}`);
    }
  }

  async stopRecording() {
    logger.info(`Stopping PulseAudio recording process...`);

    if (this.recordingProcess) {
      try {
        this.recordingProcess.kill("SIGTERM");
      } catch (err) {
        logger.warn(`Error terminating recording process: ${err.message}`);
      }
    }

    // Clean up PulseAudio module
    if (this.moduleIndex) {
      try {
        await this.execAsync(`pactl unload-module ${this.moduleIndex}`);
        logger.info(`Unloaded PulseAudio module ${this.moduleIndex}`);
      } catch (err) {
        logger.warn(`Failed to unload PulseAudio module: ${err.message}`);
      }
    }

    // Ensure audio file exists
    if (!this.audioFile || !fs.existsSync(this.audioFile)) {
      logger.warn(`Audio file missing upon stop. Creating failsafe WAV.`);
      this.writeFailsafeWavHeader();
    }

    return this.audioFile;
  }
}

module.exports = { PulseAudio };
