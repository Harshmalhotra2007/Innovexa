import { ConnectionStateGuard } from "../src/lib/webrtc/connection-state-guard";
import { PeerConnectionStatus } from "../src/lib/webrtc/types";

describe("WebRTC Connection State Guard & Asynchronous Retry Mechanism", () => {
  test("transitions cleanly through valid connection states", async () => {
    const guard = new ConnectionStateGuard();
    const transitions: Array<{ next: PeerConnectionStatus; prev: PeerConnectionStatus }> = [];

    guard.onStateChange((next, prev) => {
      transitions.push({ next, prev });
    });

    expect(guard.getStatus()).toBe("idle");

    await guard.transition("connecting");
    expect(guard.getStatus()).toBe("connecting");

    await guard.transition("connected");
    expect(guard.getStatus()).toBe("connected");

    expect(transitions).toEqual([
      { next: "connecting", prev: "idle" },
      { next: "connected", prev: "connecting" },
    ]);
  });

  test("calculates exponential backoff with jitter bounded within range", () => {
    const guard = new ConnectionStateGuard({
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffFactor: 2,
      jitterRatio: 0.1,
    });

    const delay1 = guard.calculateBackoffDelay(1);
    expect(delay1).toBeGreaterThanOrEqual(90);
    expect(delay1).toBeLessThanOrEqual(110);

    const delay2 = guard.calculateBackoffDelay(2);
    expect(delay2).toBeGreaterThanOrEqual(180);
    expect(delay2).toBeLessThanOrEqual(220);

    const delayLarge = guard.calculateBackoffDelay(10);
    expect(delayLarge).toBeLessThanOrEqual(1100);
  });

  test("executes retry loop and stops at max retries if reconnection continuously fails", async () => {
    jest.useFakeTimers();

    const guard = new ConnectionStateGuard({
      maxRetries: 3,
      initialDelayMs: 50,
      maxDelayMs: 200,
      backoffFactor: 2,
      jitterRatio: 0,
    });

    let attemptsMade = 0;
    const reconnectAction = jest.fn().mockImplementation(async () => {
      attemptsMade++;
      throw new Error("Simulated network down");
    });

    const retryPromise = guard.scheduleRetry(reconnectAction);

    // Fast-forward through timers
    for (let i = 0; i < 4; i++) {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    }

    const success = await retryPromise;
    expect(success).toBe(false);
    expect(guard.getStatus()).toBe("failed");
    expect(attemptsMade).toBe(3);

    jest.useRealTimers();
  });

  test("resets retry counter on successful reconnection", async () => {
    jest.useFakeTimers();

    const guard = new ConnectionStateGuard({
      maxRetries: 3,
      initialDelayMs: 50,
      backoffFactor: 2,
      jitterRatio: 0,
    });

    let attempts = 0;
    const reconnectAction = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts === 2) {
        await guard.transition("connected");
        return;
      }
      throw new Error("Temporary blip");
    });

    const retryPromise = guard.scheduleRetry(reconnectAction);

    // Advance 1st retry
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    // Advance 2nd retry
    jest.advanceTimersByTime(200);
    await Promise.resolve();

    const result = await retryPromise;
    expect(result).toBe(true);
    expect(guard.getStatus()).toBe("connected");
    expect(guard.getTelemetry().retryCount).toBe(0);

    jest.useRealTimers();
  });
});
