import { PeerConnectionStatus, RetryPolicy, DEFAULT_RETRY_POLICY, ConnectionTelemetry } from "./types";

export type StateChangeCallback = (newStatus: PeerConnectionStatus, prevStatus: PeerConnectionStatus) => void;
export type RetryAttemptCallback = (attempt: number, delayMs: number) => void;

/**
 * Asynchronous WebRTC Connection State Guard & Exponential Backoff Retry Handler
 */
export class ConnectionStateGuard {
  private currentStatus: PeerConnectionStatus = "idle";
  private retryPolicy: RetryPolicy;
  private currentRetryCount: number = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private isProcessingTransition: boolean = false;
  private lastStateChangeTimestamp: number = Date.now();
  private lastError: string | null = null;
  private stateChangeListeners: Set<StateChangeCallback> = new Set();
  private retryListeners: Set<RetryAttemptCallback> = new Set();

  constructor(policy: Partial<RetryPolicy> = {}) {
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, ...policy };
  }

  /**
   * Registers a listener for state changes.
   */
  public onStateChange(listener: StateChangeCallback): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Registers a listener for retry attempts.
   */
  public onRetry(listener: RetryAttemptCallback): () => void {
    this.retryListeners.add(listener);
    return () => this.retryListeners.delete(listener);
  }

  /**
   * Returns current peer connection status.
   */
  public getStatus(): PeerConnectionStatus {
    return this.currentStatus;
  }

  /**
   * Returns telemetry information.
   */
  public getTelemetry(): ConnectionTelemetry {
    return {
      connectionStatus: this.currentStatus,
      retryCount: this.currentRetryCount,
      lastStateChange: this.lastStateChangeTimestamp,
      bufferedCandidatesCount: 0,
      drainedCandidatesCount: 0,
      lastError: this.lastError,
    };
  }

  /**
   * Atomically transitions peer connection state with guard validation.
   */
  public async transition(targetStatus: PeerConnectionStatus, reason?: string): Promise<boolean> {
    if (this.currentStatus === targetStatus) {
      return false;
    }

    // Terminal closed state cannot transition further
    if (this.currentStatus === "closed" && targetStatus !== "idle") {
      console.warn(`[ConnectionStateGuard] Cannot transition from closed to ${targetStatus}`);
      return false;
    }

    const prevStatus = this.currentStatus;
    this.currentStatus = targetStatus;
    this.lastStateChangeTimestamp = Date.now();

    if (reason) {
      this.lastError = reason;
    }

    if (targetStatus === "connected") {
      this.resetRetryCount();
      this.clearRetryTimer();
    }

    // Notify listeners
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(targetStatus, prevStatus);
      } catch (err) {
        console.error("[ConnectionStateGuard] Listener notification error:", err);
      }
    });

    return true;
  }

  /**
   * Calculates exponential backoff with jitter.
   */
  public calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.retryPolicy.initialDelayMs * Math.pow(this.retryPolicy.backoffFactor, attempt - 1);
    const cappedDelay = Math.min(baseDelay, this.retryPolicy.maxDelayMs);
    
    // Add jitter: [-jitterRatio, +jitterRatio]
    const jitterFactor = 1 + (Math.random() * 2 - 1) * this.retryPolicy.jitterRatio;
    return Math.max(0, Math.round(cappedDelay * jitterFactor));
  }

  /**
   * Schedules an asynchronous reconnection retry attempt.
   */
  public scheduleRetry(reconnectAction: () => Promise<void>): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.currentRetryCount >= this.retryPolicy.maxRetries) {
        this.transition("failed", "Max retry attempts exceeded.");
        resolve(false);
        return;
      }

      this.clearRetryTimer();
      this.currentRetryCount++;
      const delay = this.calculateBackoffDelay(this.currentRetryCount);

      this.transition("reconnecting", `Retry attempt ${this.currentRetryCount}/${this.retryPolicy.maxRetries} in ${delay}ms`);

      this.retryListeners.forEach((cb) => {
        try {
          cb(this.currentRetryCount, delay);
        } catch (e) {
          console.error("[ConnectionStateGuard] Retry callback error:", e);
        }
      });

      this.retryTimer = setTimeout(async () => {
        try {
          await reconnectAction();
          resolve(true);
        } catch (err: any) {
          this.lastError = err?.message || "Reconnect failed";
          if (this.currentRetryCount >= this.retryPolicy.maxRetries) {
            await this.transition("failed", this.lastError || undefined);
            resolve(false);
          } else {
            // Schedule next attempt
            this.scheduleRetry(reconnectAction).then(resolve);
          }
        }
      }, delay);
    });
  }

  /**
   * Resets retry counters.
   */
  public resetRetryCount(): void {
    this.currentRetryCount = 0;
  }

  /**
   * Cancels any pending retry timers.
   */
  public clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Disposes of the guard and marks state as closed.
   */
  public dispose(): void {
    this.clearRetryTimer();
    this.transition("closed", "Disposed");
    this.stateChangeListeners.clear();
    this.retryListeners.clear();
  }
}
