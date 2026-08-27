/**
 * Shared helpers for parsing transcript timestamps and formatting durations.
 *
 * Transcripts arrive from the diarizer as bracketed strings like "[mm:ss]"
 * or, for long meetings, "[hh:mm:ss]". Returning a defensive 0 on
 * unparseable input prevents audio.currentTime from getting set to NaN.
 */

export function parseTranscriptTimestamp(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[\[\]\s]/g, "");
  const parts = cleaned.split(":");
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) return 0;

  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  if (parts.length === 1) {
    return Number(parts[0]);
  }
  return 0;
}

export function formatDuration(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "00:00";
  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}
