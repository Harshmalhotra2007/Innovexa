/**
 * Resilience Handler for AI Agent
 * Handles disconnects, kick events, lobby timeouts, and crash recovery.
 */
class ResilienceHandler {
  constructor(maxRetries = 3, retryDelayMs = 5000) {
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.attemptCount = 0;
  }

  async executeWithRetry(actionFn, onRetryFn) {
    while (this.attemptCount < this.maxRetries) {
      try {
        return await actionFn();
      } catch (err) {
        this.attemptCount++;
        console.warn(`[ResilienceHandler] Attempt ${this.attemptCount} failed: ${err.message}. Retrying in ${this.retryDelayMs}ms...`);
        if (onRetryFn) {
          await onRetryFn(err, this.attemptCount);
        }
        if (this.attemptCount >= this.maxRetries) {
          throw new Error(`[ResilienceHandler] Max retries (${this.maxRetries}) exceeded. Last error: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
    }
  }

  reset() {
    this.attemptCount = 0;
  }
}

module.exports = { ResilienceHandler };