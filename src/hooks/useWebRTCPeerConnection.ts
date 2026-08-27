"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PeerConnectionStatus, WebRTCConfig, SignalingMessage } from "@/lib/webrtc/types";
import { IceCandidateBuffer } from "@/lib/webrtc/ice-candidate-buffer";
import { ConnectionStateGuard } from "@/lib/webrtc/connection-state-guard";
import { SignalingChannelSync } from "@/lib/webrtc/signaling-sync";

export interface UseWebRTCPeerConnectionOptions extends WebRTCConfig {
  roomId: string;
  userId: string;
  onRemoteTrack?: (track: MediaStreamTrack, streams: readonly MediaStream[]) => void;
  onSignalingMessage?: (message: SignalingMessage) => void;
  autoConnect?: boolean;
}

export function useWebRTCPeerConnection({
  roomId,
  userId,
  iceServers = [{ urls: "stun:stun.l.google.com:19302" }],
  retryPolicy,
  onRemoteTrack,
  onSignalingMessage,
  autoConnect = false,
}: UseWebRTCPeerConnectionOptions) {
  const [status, setStatus] = useState<PeerConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const candidateBufferRef = useRef<IceCandidateBuffer>(new IceCandidateBuffer(100));
  const stateGuardRef = useRef<ConnectionStateGuard>(new ConnectionStateGuard(retryPolicy));
  const signalingSyncRef = useRef<SignalingChannelSync>(new SignalingChannelSync(500));

  // Initialize state guard listeners
  useEffect(() => {
    const guard = stateGuardRef.current;
    const unsubState = guard.onStateChange((newStatus, _prev) => {
      setStatus(newStatus);
    });

    const unsubRetry = guard.onRetry((attempt, delayMs) => {
      console.log(`[useWebRTC] Reconnecting attempt ${attempt} in ${delayMs}ms`);
    });

    return () => {
      unsubState();
      unsubRetry();
    };
  }, []);

  /**
   * Initializes or re-initializes the RTCPeerConnection instance.
   */
  const createPeerConnection = useCallback(() => {
    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") {
      return null;
    }

    // Clean up any existing connection
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
    }

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    // Reset candidate buffer for new connection
    candidateBufferRef.current.clear();

    pc.onicecandidate = (event) => {
      if (event.candidate && onSignalingMessage) {
        onSignalingMessage({
          type: "ice-candidate",
          senderId: userId,
          roomId,
          timestamp: Date.now(),
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const connState = pc.connectionState;
      switch (connState) {
        case "connecting":
          stateGuardRef.current.transition("connecting");
          break;
        case "connected":
          stateGuardRef.current.transition("connected");
          setError(null);
          break;
        case "disconnected":
          stateGuardRef.current.transition("disconnected");
          stateGuardRef.current.scheduleRetry(async () => {
            await restartIce();
          });
          break;
        case "failed":
          stateGuardRef.current.transition("failed", "ICE / Peer connection failed");
          stateGuardRef.current.scheduleRetry(async () => {
            await restartIce();
          });
          break;
        case "closed":
          stateGuardRef.current.transition("closed");
          break;
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
      if (onRemoteTrack) {
        onRemoteTrack(event.track, event.streams);
      }
    };

    return pc;
  }, [iceServers, onRemoteTrack, onSignalingMessage, roomId, userId]);

  /**
   * Restarts ICE negotiation for connection recovery.
   */
  const restartIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      if (onSignalingMessage) {
        onSignalingMessage({
          type: "offer",
          senderId: userId,
          roomId,
          timestamp: Date.now(),
          sdp: offer.sdp,
        });
      }
    } catch (err: any) {
      console.error("[useWebRTC] ICE restart offer failed:", err);
      throw err;
    }
  }, [onSignalingMessage, roomId, userId]);

  /**
   * Creates an initial SDP offer.
   */
  const createOffer = useCallback(async () => {
    let pc = pcRef.current;
    if (!pc || pc.signalingState === "closed") {
      pc = createPeerConnection();
    }
    if (!pc) throw new Error("RTCPeerConnection is not supported in this environment");

    stateGuardRef.current.transition("connecting");

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (onSignalingMessage) {
        onSignalingMessage({
          type: "offer",
          senderId: userId,
          roomId,
          timestamp: Date.now(),
          sdp: offer.sdp,
        });
      }

      return offer;
    } catch (err: any) {
      setError(err.message || "Failed to create offer");
      stateGuardRef.current.transition("failed", err.message);
      throw err;
    }
  }, [createPeerConnection, onSignalingMessage, roomId, userId]);

  /**
   * Handles a remote offer and creates an answer.
   */
  const handleRemoteOffer = useCallback(async (sdp: string) => {
    let pc = pcRef.current;
    if (!pc || pc.signalingState === "closed") {
      pc = createPeerConnection();
    }
    if (!pc) throw new Error("RTCPeerConnection is not supported");

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
      
      // Flush buffered ICE candidates
      await candidateBufferRef.current.drain(async (cand) => {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(cand as RTCIceCandidateInit));
        }
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (onSignalingMessage) {
        onSignalingMessage({
          type: "answer",
          senderId: userId,
          roomId,
          timestamp: Date.now(),
          sdp: answer.sdp,
        });
      }

      return answer;
    } catch (err: any) {
      setError(err.message || "Failed to handle remote offer");
      throw err;
    }
  }, [createPeerConnection, onSignalingMessage, roomId, userId]);

  /**
   * Handles a remote answer.
   */
  const handleRemoteAnswer = useCallback(async (sdp: string) => {
    const pc = pcRef.current;
    if (!pc) throw new Error("RTCPeerConnection is not initialized");

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));

      // Flush buffered ICE candidates
      await candidateBufferRef.current.drain(async (cand) => {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(cand as RTCIceCandidateInit));
        }
      });
    } catch (err: any) {
      setError(err.message || "Failed to set remote answer");
      throw err;
    }
  }, []);

  /**
   * Adds an inbound ICE candidate or buffers it if remote description is not yet set.
   */
  const addRemoteIceCandidate = useCallback(async (candidate: any) => {
    const pc = pcRef.current;

    await candidateBufferRef.current.addCandidate(candidate, async (sanitized) => {
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(sanitized as RTCIceCandidateInit));
      }
    });
  }, []);

  /**
   * Adds local tracks (audio/video).
   */
  const addTrack = useCallback((track: MediaStreamTrack, stream: MediaStream) => {
    const pc = pcRef.current;
    if (pc) {
      return pc.addTrack(track, stream);
    }
    return null;
  }, []);

  /**
   * Cleans up the connection.
   */
  const close = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }
    candidateBufferRef.current.clear();
    stateGuardRef.current.dispose();
    signalingSyncRef.current.clear();
    setRemoteStream(null);
  }, []);

  // Handle autoConnect & cleanup
  useEffect(() => {
    if (autoConnect) {
      createPeerConnection();
    }

    return () => {
      close();
    };
  }, [autoConnect, createPeerConnection, close]);

  return {
    status,
    error,
    remoteStream,
    peerConnection: pcRef.current,
    createOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    addRemoteIceCandidate,
    addTrack,
    restartIce,
    close,
  };
}
