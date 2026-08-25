/**
 * Resilient Circuit Breaker Implementation
 * Prevents cascading service failures by tripping circuit when downstream endpoints fail repeatedly.
 */

export class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private consecutiveFailures = 0;
  private nextAttemptTime = 0;

  constructor(
    private failureThreshold: number = 3,
    private cooldownPeriodMs: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === "OPEN") {
      if (now >= this.nextAttemptTime) {
        this.state = "HALF_OPEN";
        console.warn("[CircuitBreaker] Cool-down period elapsed. Transitioning circuit to HALF_OPEN (Trial request)...");
      } else {
        const remainingSecs = Math.ceil((this.nextAttemptTime - now) / 1000);
        throw new Error(`[CircuitBreaker] Circuit is OPEN (Service cool-down in progress for ${remainingSecs}s). Request blocked to prevent cascade failures.`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.consecutiveFailures = 0;
    if (this.state === "HALF_OPEN") {
      console.log("[CircuitBreaker] Trial request succeeded! Circuit reset to CLOSED.");
    }
    this.state = "CLOSED";
  }

  private onFailure() {
    this.consecutiveFailures++;
    console.warn(`[CircuitBreaker] Service failure recorded (${this.consecutiveFailures}/${this.failureThreshold}).`);
    if (this.consecutiveFailures >= this.failureThreshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
      console.error(`[CircuitBreaker] Failure threshold reached! Circuit TRIPPED to OPEN for ${this.cooldownPeriodMs / 1000}s.`);
    }
  }

  getStatus() {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}

// Global Singleton Circuit Breaker for Bot Service HTTP requests
export const botServiceCircuitBreaker = new CircuitBreaker(3, 30000);
