/**
 * Centralized Metrics Collection Engine for Innovexa Meet Bot
 * Tracks session success rate, join times, audio duration, error frequency, and retries.
 */

class MetricsCollector {
  constructor() {
    this.totalSessionsTriggered = 0;
    this.successfulJoins = 0;
    this.successfulLeaves = 0;
    this.failedSessions = 0;
    this.totalAudioDurationSeconds = 0;
    this.joinTimesMs = [];
    this.retryAttemptsTotal = 0;
    this.errorFrequencies = {};
    this.startTime = new Date().toISOString();
  }

  recordSessionStart() {
    this.totalSessionsTriggered++;
  }

  recordJoinSuccess(joinTimeMs) {
    this.successfulJoins++;
    if (typeof joinTimeMs === "number" && joinTimeMs > 0) {
      this.joinTimesMs.push(joinTimeMs);
    }
  }

  recordLeaveSuccess() {
    this.successfulLeaves++;
  }

  recordSessionFailure(errorMessage = "Unknown error") {
    this.failedSessions++;
    const errType = errorMessage.substring(0, 60);
    this.errorFrequencies[errType] = (this.errorFrequencies[errType] || 0) + 1;
  }

  recordRetryAttempt() {
    this.retryAttemptsTotal++;
  }

  recordAudioDuration(durationSeconds) {
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      this.totalAudioDurationSeconds += durationSeconds;
    }
  }

  getSummary() {
    const totalFinished = this.successfulJoins + this.failedSessions;
    const successRatePercent = totalFinished > 0 
      ? `${Math.round((this.successfulJoins / totalFinished) * 1000) / 10}%`
      : "100%";

    const avgJoinTimeMs = this.joinTimesMs.length > 0
      ? Math.round(this.joinTimesMs.reduce((a, b) => a + b, 0) / this.joinTimesMs.length)
      : 0;

    return {
      service: "innovexa-meet-bot",
      uptimeStart: this.startTime,
      totalSessionsTriggered: this.totalSessionsTriggered,
      successfulJoins: this.successfulJoins,
      successfulLeaves: this.successfulLeaves,
      failedSessions: this.failedSessions,
      successRatePercent,
      averageJoinTimeMs: `${avgJoinTimeMs}ms`,
      totalAudioDurationSeconds: `${Math.round(this.totalAudioDurationSeconds)}s`,
      retryAttemptsTotal: this.retryAttemptsTotal,
      errorFrequencies: this.errorFrequencies,
    };
  }
}

const metrics = new MetricsCollector();
module.exports = metrics;
