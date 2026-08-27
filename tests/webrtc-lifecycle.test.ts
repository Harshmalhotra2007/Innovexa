/**
 * WebRTC Lifecycle & Peer Connection Integration Tests
 */

// Mock WebRTC environment for Node.js test runner
class MockRTCSessionDescription {
  type: string;
  sdp: string;
  constructor(init: { type: string; sdp: string }) {
    this.type = init.type;
    this.sdp = init.sdp;
  }
}

class MockRTCIceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
  constructor(init: any) {
    this.candidate = init.candidate;
    this.sdpMid = init.sdpMid;
    this.sdpMLineIndex = init.sdpMLineIndex;
    this.usernameFragment = init.usernameFragment;
  }
}

class MockRTCPeerConnection {
  connectionState: string = "new";
  signalingState: string = "stable";
  remoteDescription: any = null;
  localDescription: any = null;
  addedCandidates: any[] = [];
  onicecandidate: any = null;
  onconnectionstatechange: any = null;
  ontrack: any = null;

  constructor(public config?: any) {}

  async createOffer(options?: any) {
    return new MockRTCSessionDescription({
      type: "offer",
      sdp: "v=0\r\no=- 1000 2 IN IP4 127.0.0.1\r\ns=MockOffer\r\n",
    });
  }

  async createAnswer(options?: any) {
    return new MockRTCSessionDescription({
      type: "answer",
      sdp: "v=0\r\no=- 2000 2 IN IP4 127.0.0.1\r\ns=MockAnswer\r\n",
    });
  }

  async setLocalDescription(desc: any) {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: any) {
    this.remoteDescription = desc;
  }

  async addIceCandidate(candidate: any) {
    this.addedCandidates.push(candidate);
  }

  addTrack(track: any, stream: any) {
    return { track };
  }

  close() {
    this.connectionState = "closed";
    this.signalingState = "closed";
    if (this.onconnectionstatechange) {
      this.onconnectionstatechange();
    }
  }
}

(global as any).RTCSessionDescription = MockRTCSessionDescription;
(global as any).RTCIceCandidate = MockRTCIceCandidate;
(global as any).RTCPeerConnection = MockRTCPeerConnection;
(global as any).window = global;

import { IceCandidateBuffer } from "../src/lib/webrtc/ice-candidate-buffer";
import { ConnectionStateGuard } from "../src/lib/webrtc/connection-state-guard";
import { SignalingChannelSync } from "../src/lib/webrtc/signaling-sync";

describe("WebRTC Peer Connection Lifecycle & Negotiation Controller", () => {
  let pc: MockRTCPeerConnection;
  let candidateBuffer: IceCandidateBuffer;
  let stateGuard: ConnectionStateGuard;
  let signalingSync: SignalingChannelSync;

  beforeEach(() => {
    pc = new MockRTCPeerConnection();
    candidateBuffer = new IceCandidateBuffer(100);
    stateGuard = new ConnectionStateGuard();
    signalingSync = new SignalingChannelSync();
  });

  afterEach(() => {
    pc.close();
    candidateBuffer.clear();
    stateGuard.dispose();
    signalingSync.clear();
  });

  test("initializes connection state in idle and creates offer", async () => {
    expect(stateGuard.getStatus()).toBe("idle");

    await stateGuard.transition("connecting");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    expect(offer.type).toBe("offer");
    expect(pc.localDescription.sdp).toBe(offer.sdp);
    expect(stateGuard.getStatus()).toBe("connecting");
  });

  test("buffers candidates received before remote answer and flushes upon setting remote description", async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Inbound candidate arrives over signaling channel before answer
    const rawCandidate = {
      candidate: "candidate:1 1 UDP 1 127.0.0.1 6000 typ host",
      sdpMid: "0",
    };

    const addRes = await candidateBuffer.addCandidate(rawCandidate, async (cand) => {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(cand);
      }
    });

    expect(addRes.buffered).toBe(true);
    expect(pc.addedCandidates.length).toBe(0);

    // Now remote answer arrives
    const remoteAnswer = new MockRTCSessionDescription({
      type: "answer",
      sdp: "v=0\r\ns=RemoteAnswer\r\n",
    });
    await pc.setRemoteDescription(remoteAnswer);

    // Drain buffer
    const drainRes = await candidateBuffer.drain(async (cand) => {
      await pc.addIceCandidate(cand);
    });

    expect(drainRes.drainedCount).toBe(1);
    expect(pc.addedCandidates.length).toBe(1);
    expect(pc.addedCandidates[0].candidate).toBe(rawCandidate.candidate);
  });

  test("handles ICE restart negotiation loop upon disconnection", async () => {
    let iceRestartAttempted = false;

    stateGuard.onRetry(async () => {
      iceRestartAttempted = true;
      const restartOffer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(restartOffer);
    });

    // Simulate transient network disconnect
    await stateGuard.transition("disconnected");
    expect(stateGuard.getStatus()).toBe("disconnected");

    await stateGuard.scheduleRetry(async () => {
      await stateGuard.transition("connected");
    });

    expect(stateGuard.getStatus()).toBe("connected");
  });

  test("teardown cleanly disposes state guard, candidate buffer and closes peer connection", async () => {
    await stateGuard.transition("connected");
    await candidateBuffer.addCandidate({ candidate: "candidate:99" });

    // Execute disposal
    pc.close();
    candidateBuffer.clear();
    stateGuard.dispose();

    expect(pc.connectionState).toBe("closed");
    expect(stateGuard.getStatus()).toBe("closed");
    expect(candidateBuffer.getMetrics().bufferedCount).toBe(0);
  });
});
