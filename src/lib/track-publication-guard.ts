/**
 * TrackPublicationGuard
 * Event-driven lifecycle manager that guarantees WebRTC track publication
 * and connection stabilization before initiating Egress or recording streams.
 */

export type GuardState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "WAITING_FOR_TRACKS"
  | "TRACKS_PUBLISHED"
  | "RECORDING_READY"
  | "FAILED";

export interface TrackPublicationGuardOptions {
  requiredAudioTracks?: number;
  requiredVideoTracks?: number;
  trackPublishTimeoutMs?: number;
  onStateChange?: (state: GuardState) => void;
  onTracksReady?: (audioCount: number, videoCount: number) => void;
  onTimeout?: () => void;
  onError?: (err: Error) => void;
}

export interface TrackSummary {
  audioTracks: number;
  videoTracks: number;
  totalTracks: number;
}

export class TrackPublicationGuard {
  private state: GuardState = "DISCONNECTED";
  private audioTrackCount: number = 0;
  private videoTrackCount: number = 0;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private options: Required<TrackPublicationGuardOptions>;

  constructor(options: TrackPublicationGuardOptions = {}) {
    this.options = {
      requiredAudioTracks: options.requiredAudioTracks ?? 1,
      requiredVideoTracks: options.requiredVideoTracks ?? 0,
      trackPublishTimeoutMs: options.trackPublishTimeoutMs ?? 15000,
      onStateChange: options.onStateChange ?? (() => {}),
      onTracksReady: options.onTracksReady ?? (() => {}),
      onTimeout: options.onTimeout ?? (() => {}),
      onError: options.onError ?? (() => {}),
    };
  }

  public getState(): GuardState {
    return this.state;
  }

  public getTrackSummary(): TrackSummary {
    return {
      audioTracks: this.audioTrackCount,
      videoTracks: this.videoTrackCount,
      totalTracks: this.audioTrackCount + this.videoTrackCount,
    };
  }

  public canStartRecording(): boolean {
    return (
      this.state === "TRACKS_PUBLISHED" || this.state === "RECORDING_READY"
    );
  }

  public onConnectionStarted(): void {
    this.transitionTo("CONNECTING");
    this.startTimeoutTimer();
  }

  public onConnectionEstablished(): void {
    if (this.state === "CONNECTING" || this.state === "DISCONNECTED") {
      this.transitionTo("CONNECTED");
      this.evaluateTrackReadiness();
    }
  }

  public onTrackPublished(kind: "audio" | "video" | string): void {
    if (kind === "audio") {
      this.audioTrackCount++;
    } else if (kind === "video") {
      this.videoTrackCount++;
    }

    this.evaluateTrackReadiness();
  }

  public onTrackUnpublished(kind: "audio" | "video" | string): void {
    if (kind === "audio" && this.audioTrackCount > 0) {
      this.audioTrackCount--;
    } else if (kind === "video" && this.videoTrackCount > 0) {
      this.videoTrackCount--;
    }

    if (
      this.audioTrackCount < this.options.requiredAudioTracks ||
      this.videoTrackCount < this.options.requiredVideoTracks
    ) {
      if (this.state === "TRACKS_PUBLISHED" || this.state === "RECORDING_READY") {
        this.transitionTo("WAITING_FOR_TRACKS");
      }
    }
  }

  public onConnectionClosed(): void {
    this.clearTimeoutTimer();
    this.audioTrackCount = 0;
    this.videoTrackCount = 0;
    this.transitionTo("DISCONNECTED");
  }

  public markRecordingStarted(): void {
    if (this.canStartRecording()) {
      this.transitionTo("RECORDING_READY");
    }
  }

  public reset(): void {
    this.clearTimeoutTimer();
    this.audioTrackCount = 0;
    this.videoTrackCount = 0;
    this.state = "DISCONNECTED";
  }

  private evaluateTrackReadiness(): void {
    const hasRequiredAudio =
      this.audioTrackCount >= this.options.requiredAudioTracks;
    const hasRequiredVideo =
      this.videoTrackCount >= this.options.requiredVideoTracks;

    if (hasRequiredAudio && hasRequiredVideo) {
      this.clearTimeoutTimer();
      this.transitionTo("TRACKS_PUBLISHED");
      this.options.onTracksReady(this.audioTrackCount, this.videoTrackCount);
    } else if (
      this.state === "CONNECTED" ||
      this.state === "CONNECTING"
    ) {
      this.transitionTo("WAITING_FOR_TRACKS");
    }
  }

  private transitionTo(newState: GuardState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onStateChange(newState);
    }
  }

  private startTimeoutTimer(): void {
    this.clearTimeoutTimer();
    this.timeoutTimer = setTimeout(() => {
      if (!this.canStartRecording()) {
        this.transitionTo("FAILED");
        this.options.onTimeout();
        this.options.onError(
          new Error(
            `TrackPublicationGuard timed out waiting for active tracks after ${this.options.trackPublishTimeoutMs}ms`
          )
        );
      }
    }, this.options.trackPublishTimeoutMs);
  }

  private clearTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}
