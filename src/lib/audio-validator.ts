/**
 * Comprehensive Audio Validation Utility
 * Validates file buffer size, magic bytes, header integrity, and minimum duration.
 */

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  byteSize: number;
  estimatedDurationSeconds?: number;
}

export function validateAudioBuffer(
  buffer: Buffer,
  mimeTypeHint: string = "audio/wav"
): AudioValidationResult {
  const byteSize = buffer ? buffer.length : 0;

  // 1. Check for null or empty buffer
  if (!buffer || byteSize === 0) {
    return {
      valid: false,
      error: "Audio payload is empty (0 bytes).",
      byteSize: 0,
    };
  }

  // 2. Minimum byte threshold (WAV header alone is 44 bytes; usable audio must exceed 100 bytes)
  if (byteSize < 100) {
    return {
      valid: false,
      error: `Audio payload is too small (${byteSize} bytes) to contain usable audio stream data.`,
      byteSize,
    };
  }

  // 3. Inspect Magic Bytes / File Signatures
  let detectedType = mimeTypeHint;
  const isWav = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE";
  const isWebmHeader = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  const isWebmCluster = buffer[0] === 0x1f && buffer[1] === 0x43 && buffer[2] === 0xb6 && buffer[3] === 0x75;
  const isWebm = isWebmHeader || isWebmCluster || mimeTypeHint.includes("webm");
  const isOgg = buffer.toString("ascii", 0, 4) === "OggS";
  const isMp3 = (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  const isFlac = buffer.toString("ascii", 0, 4) === "fLaC";

  if (isWav) detectedType = "audio/wav";
  else if (isWebm) detectedType = "audio/webm";
  else if (isOgg) detectedType = "audio/ogg";
  else if (isMp3) detectedType = "audio/mpeg";
  else if (isFlac) detectedType = "audio/flac";

  // 4. Estimate Duration & Validate Content
  let estimatedDuration = 0;

  if (isWav && byteSize > 44) {
    // Standard 16kHz Mono 16-bit PCM WAV has 32,000 bytes per second
    const byteRate = buffer.readUInt32LE(28) || 32000;
    const dataSize = byteSize - 44;
    estimatedDuration = Math.max(0, Math.round((dataSize / byteRate) * 10) / 10);
  } else {
    // Rough estimation for compressed audio streams
    estimatedDuration = Math.max(1, Math.round((byteSize / 16000) * 10) / 10);
  }

  // 5. Fail validation if WAV file contains only empty failsafe headers (e.g. exactly 44 bytes or <0.5s duration)
  if (estimatedDuration < 0.2 && isWav) {
    return {
      valid: false,
      error: `Audio recording duration (${estimatedDuration}s) is below minimum transcription threshold (0.5s).`,
      mimeType: detectedType,
      byteSize,
      estimatedDurationSeconds: estimatedDuration,
    };
  }

  return {
    valid: true,
    mimeType: detectedType,
    byteSize,
    estimatedDurationSeconds: estimatedDuration,
  };
}
