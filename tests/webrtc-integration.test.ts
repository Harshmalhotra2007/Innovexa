/**
 * WebRTC End-to-End Integration & Multi-Peer Negotiation Test Suite
 */

import { IceCandidateBuffer } from "../src/lib/webrtc/ice-candidate-buffer";
import { ConnectionStateGuard } from "../src/lib/webrtc/connection-state-guard";
import { SignalingChannelSync } from "../src/lib/webrtc/signaling-sync";

// Mock WebRTC primitives
class MockSessionDescription {
  type: string;
  sdp: string;
  constructor(init: { type: string; sdp: string }) {
    this.type = init.type;
    this.sdp = init.sdp;
  }
}

class SimulatedPeer {
  id: string;
  roomId: string;
  stateGuard: ConnectionStateGuard;
  candidateBuffer: IceCandidateBuffer;
  signalingSync: SignalingChannelSync;
  localDescription: any = null;
  remoteDescription: any = null;
  candidatesApplied: any[] = [];

  constructor(id: string, roomId: string) {
    this.id = id;
    this.roomId = roomId;
    this.stateGuard = new ConnectionStateGuard();
    this.candidateBuffer = new IceCandidateBuffer(100);
    this.signalingSync = new SignalingChannelSync();
  }

  async createOffer() {
    this.localDescription = new MockSessionDescription({
      type: "offer",
      sdp: `v=0\r\ns=OfferFrom-${this.id}\r\n`,
    });
    await this.stateGuard.transition("connecting");
    return this.localDescription;
  }

  async handleOfferAndCreateAnswer(offerSdp: string) {
    this.remoteDescription = new MockSessionDescription({
      type: "offer",
      sdp: offerSdp,
    });
    this.candidateBuffer.setRemoteDescriptionReady(true);

    // Drain any buffered candidates
    await this.candidateBuffer.drain(async (c) => {
      this.candidatesApplied.push(c);
    });

    this.localDescription = new MockSessionDescription({
      type: "answer",
      sdp: `v=0\r\ns=AnswerFrom-${this.id}\r\n`,
    });
    await this.stateGuard.transition("connected");
    return this.localDescription;
  }

  async handleAnswer(answerSdp: string) {
    this.remoteDescription = new MockSessionDescription({
      type: "answer",
      sdp: answerSdp,
    });
    this.candidateBuffer.setRemoteDescriptionReady(true);

    await this.candidateBuffer.drain(async (c) => {
      this.candidatesApplied.push(c);
    });

    await this.stateGuard.transition("connected");
  }

  async receiveCandidate(candidate: any) {
    await this.candidateBuffer.addCandidate(candidate, async (c) => {
      if (this.remoteDescription) {
        this.candidatesApplied.push(c);
      }
    });
  }

  dispose() {
    this.stateGuard.dispose();
    this.candidateBuffer.clear();
    this.signalingSync.clear();
  }
}

describe("WebRTC Multi-Peer Integration & Resilience", () => {
  let peerA: SimulatedPeer;
  let peerB: SimulatedPeer;
  const roomId = "ops-war-room-101";

  beforeEach(() => {
    peerA = new SimulatedPeer("peer-A", roomId);
    peerB = new SimulatedPeer("peer-B", roomId);
  });

  afterEach(() => {
    peerA.dispose();
    peerB.dispose();
  });

  test("successfully establishes bi-directional negotiation across two peers", async () => {
    // Peer A initiates offer
    const offer = await peerA.createOffer();
    expect(peerA.stateGuard.getStatus()).toBe("connecting");

    // Candidate trickling from Peer A to Peer B BEFORE Peer B processes offer
    const candA1 = { candidate: "candidate:A1 UDP 192.168.1.1 5000", sdpMid: "0" };
    await peerB.receiveCandidate(candA1);
    expect(peerB.candidatesApplied.length).toBe(0); // Buffered

    // Peer B receives offer and generates answer
    const answer = await peerB.handleOfferAndCreateAnswer(offer.sdp);
    expect(peerB.stateGuard.getStatus()).toBe("connected");
    expect(peerB.candidatesApplied.length).toBe(1); // Buffered candidate drained

    // Peer A receives answer from Peer B
    await peerA.handleAnswer(answer.sdp);
    expect(peerA.stateGuard.getStatus()).toBe("connected");

    // Candidate trickling from Peer B to Peer A AFTER connection
    const candB1 = { candidate: "candidate:B1 UDP 192.168.1.2 5000", sdpMid: "0" };
    await peerA.receiveCandidate(candB1);
    expect(peerA.candidatesApplied.length).toBe(1);
    expect(peerA.candidatesApplied[0].candidate).toBe(candB1.candidate);
  });

  test("recovers from temporary signaling channel disruption via retry guard", async () => {
    jest.useFakeTimers();

    await peerA.createOffer();
    const answer = await peerB.handleOfferAndCreateAnswer(peerA.localDescription.sdp);
    await peerA.handleAnswer(answer.sdp);

    expect(peerA.stateGuard.getStatus()).toBe("connected");

    // Trigger unexpected network disconnect on Peer A
    await peerA.stateGuard.transition("disconnected");
    expect(peerA.stateGuard.getStatus()).toBe("disconnected");

    // Schedule retry and reconnect
    let reconnected = false;
    const retryPromise = peerA.stateGuard.scheduleRetry(async () => {
      const renegotiatedOffer = await peerA.createOffer();
      const renegotiatedAnswer = await peerB.handleOfferAndCreateAnswer(renegotiatedOffer.sdp);
      await peerA.handleAnswer(renegotiatedAnswer.sdp);
      reconnected = true;
    });

    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    await retryPromise;
    expect(reconnected).toBe(true);
    expect(peerA.stateGuard.getStatus()).toBe("connected");

    jest.useRealTimers();
  });
});
