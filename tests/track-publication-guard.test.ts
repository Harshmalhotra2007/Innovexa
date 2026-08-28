import { TrackPublicationGuard } from "../src/lib/track-publication-guard";

describe("TrackPublicationGuard - Event-Driven WebRTC Track Lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize in DISCONNECTED state with 0 tracks", () => {
    const guard = new TrackPublicationGuard();
    expect(guard.getState()).toBe("DISCONNECTED");
    expect(guard.getTrackSummary()).toEqual({
      audioTracks: 0,
      videoTracks: 0,
      totalTracks: 0,
    });
    expect(guard.canStartRecording()).toBe(false);
  });

  it("should transition through CONNECTING and CONNECTED states", () => {
    const stateChanges: string[] = [];
    const guard = new TrackPublicationGuard({
      onStateChange: (state) => stateChanges.push(state),
    });

    guard.onConnectionStarted();
    expect(guard.getState()).toBe("CONNECTING");

    guard.onConnectionEstablished();
    expect(guard.getState()).toBe("WAITING_FOR_TRACKS");
    expect(stateChanges).toContain("CONNECTING");
    expect(stateChanges).toContain("WAITING_FOR_TRACKS");
  });

  it("should transition to TRACKS_PUBLISHED and trigger onTracksReady when audio track is published", () => {
    const onTracksReady = jest.fn();
    const guard = new TrackPublicationGuard({
      requiredAudioTracks: 1,
      requiredVideoTracks: 0,
      onTracksReady,
    });

    guard.onConnectionStarted();
    guard.onConnectionEstablished();
    guard.onTrackPublished("audio");

    expect(guard.getState()).toBe("TRACKS_PUBLISHED");
    expect(guard.canStartRecording()).toBe(true);
    expect(onTracksReady).toHaveBeenCalledWith(1, 0);
  });

  it("should require both audio and video tracks when requiredVideoTracks is set to 1", () => {
    const guard = new TrackPublicationGuard({
      requiredAudioTracks: 1,
      requiredVideoTracks: 1,
    });

    guard.onConnectionStarted();
    guard.onConnectionEstablished();

    guard.onTrackPublished("audio");
    expect(guard.getState()).toBe("WAITING_FOR_TRACKS");
    expect(guard.canStartRecording()).toBe(false);

    guard.onTrackPublished("video");
    expect(guard.getState()).toBe("TRACKS_PUBLISHED");
    expect(guard.canStartRecording()).toBe(true);
  });

  it("should fallback to WAITING_FOR_TRACKS if a published track is unpublished below threshold", () => {
    const guard = new TrackPublicationGuard({
      requiredAudioTracks: 1,
    });

    guard.onConnectionStarted();
    guard.onConnectionEstablished();
    guard.onTrackPublished("audio");
    expect(guard.getState()).toBe("TRACKS_PUBLISHED");

    guard.onTrackUnpublished("audio");
    expect(guard.getState()).toBe("WAITING_FOR_TRACKS");
    expect(guard.canStartRecording()).toBe(false);
  });

  it("should transition to RECORDING_READY when recording is marked started", () => {
    const guard = new TrackPublicationGuard({ requiredAudioTracks: 1 });
    guard.onConnectionStarted();
    guard.onConnectionEstablished();
    guard.onTrackPublished("audio");

    guard.markRecordingStarted();
    expect(guard.getState()).toBe("RECORDING_READY");
    expect(guard.canStartRecording()).toBe(true);
  });

  it("should timeout and trigger onError if tracks are not published within timeout window", () => {
    const onTimeout = jest.fn();
    const onError = jest.fn();

    const guard = new TrackPublicationGuard({
      trackPublishTimeoutMs: 5000,
      onTimeout,
      onError,
    });

    guard.onConnectionStarted();
    expect(guard.getState()).toBe("CONNECTING");

    // Fast-forward 5000ms
    jest.advanceTimersByTime(5000);

    expect(guard.getState()).toBe("FAILED");
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(guard.canStartRecording()).toBe(false);
  });

  it("should cleanly reset on connection closed", () => {
    const guard = new TrackPublicationGuard({ requiredAudioTracks: 1 });
    guard.onConnectionStarted();
    guard.onConnectionEstablished();
    guard.onTrackPublished("audio");
    expect(guard.canStartRecording()).toBe(true);

    guard.onConnectionClosed();
    expect(guard.getState()).toBe("DISCONNECTED");
    expect(guard.getTrackSummary()).toEqual({
      audioTracks: 0,
      videoTracks: 0,
      totalTracks: 0,
    });
    expect(guard.canStartRecording()).toBe(false);
  });
});
