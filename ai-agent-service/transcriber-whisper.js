/**
 * Whisper.cpp Local Transcription Handler
 * Interfaces with local whisper.cpp binary or worker pool for audio transcription.
 */
const { exec } = require('child_process');
const path = require('path');
const config = require('./config');

const WHISPER_BINARY = config.whisperBinaryPath;
const WHISPER_MODEL = config.whisperModelPath;

/**
 * Transcribe audio file using local Whisper.cpp
 * @param {string} audioPath - Path to WAV audio file
 * @returns {Promise<Array>} - Array of transcript segments with timestamps
 */
async function transcribeWithWhisper(audioPath) {
  return new Promise((resolve, reject) => {
    console.log(`[WhisperTranscriber] Starting transcription for: ${audioPath}`);
    
    // Whisper.cpp command: whisper-cli -m model.bin -f audio.wav --output-json
    const cmd = `${WHISPER_BINARY} -m ${WHISPER_MODEL} -f ${audioPath} --output-json`;
    
    exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[WhisperTranscriber] Transcription error:', error.message);
        // Fallback to mock segments for development
        return resolve(getMockSegments());
      }
      
      try {
        // Parse Whisper JSON output
        const result = JSON.parse(stdout);
        const segments = result.segments || [];
        
        const formatted = segments.map((seg, i) => ({
          speaker: `Speaker ${i + 1}`, // Will be updated by diarization
          text: seg.text.trim(),
          timestamp: formatTimestamp(seg.start),
          start: seg.start,
          end: seg.end
        }));
        
        console.log(`[WhisperTranscriber] Transcription complete: ${formatted.length} segments`);
        resolve(formatted);
      } catch (parseErr) {
        console.error('[WhisperTranscriber] JSON parse error:', parseErr);
        resolve(getMockSegments());
      }
    });
  });
}

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getMockSegments() {
  // Return empty array when local transcription fails to prevent injecting unrelated conversations
  return [];
}

module.exports = { transcribeWithWhisper };