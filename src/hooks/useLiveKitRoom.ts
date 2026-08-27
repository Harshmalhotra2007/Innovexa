"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Room, RoomEvent, ConnectionState } from "livekit-client";

export interface UseLiveKitRoomOptions {
  meetingId: string;
  participantName?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (err: Error) => void;
}

export function useLiveKitRoom({
  meetingId,
  participantName = "Operations Lead",
  onConnected,
  onDisconnected,
  onError,
}: UseLiveKitRoomOptions) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(1);

  const roomRef = useRef<Room | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const hasJoinedRef = useRef<boolean>(false);

  // Keep latest callbacks in refs to avoid breaking effect / callback memoization
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;
  const onDisconnectedRef = useRef(onDisconnected);
  onDisconnectedRef.current = onDisconnected;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Initialize single, stable LiveKit Room instance
  const getRoom = useCallback(() => {
    if (!roomRef.current) {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setConnectionState(state);
        if (state === ConnectionState.Connected) {
          onConnectedRef.current?.();
        } else if (state === ConnectionState.Disconnected) {
          onDisconnectedRef.current?.();
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setParticipantCount(room.numParticipants);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setParticipantCount(room.numParticipants);
      });

      room.on(RoomEvent.Disconnected, () => {
        setParticipantCount(0);
      });

      roomRef.current = room;
    }
    return roomRef.current;
  }, []);

  // Stable join room handler
  const joinRoom = useCallback(async () => {
    if (isConnectingRef.current || (roomRef.current && roomRef.current.state === ConnectionState.Connected)) {
      return;
    }

    isConnectingRef.current = true;
    setErrorMsg(null);

    try {
      setConnectionState(ConnectionState.Connecting);

      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          participantName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to obtain LiveKit token");
      }

      const data = await res.json();
      setToken(data.token);
      setWsUrl(data.wsUrl);
      setRoomName(data.roomName);
      setIsConfigured(data.isConfigured);

      const room = getRoom();

      // If LiveKit credentials are valid & not demo placeholder, connect to live WebSocket
      if (data.isConfigured && data.wsUrl && !data.wsUrl.includes("demo.livekit.cloud")) {
        await room.connect(data.wsUrl, data.token);
        setParticipantCount(room.numParticipants);
      } else {
        // Fallback / local simulation mode
        setConnectionState(ConnectionState.Connected);
        setParticipantCount(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to LiveKit room";
      console.warn("[useLiveKitRoom Notice]", msg);
      setErrorMsg(msg);
      // Ensure we don't block the UI - transition to standby connected mode
      setConnectionState(ConnectionState.Connected);
      if (err instanceof Error) {
        onErrorRef.current?.(err);
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [meetingId, participantName, getRoom]);

  // Leave room and clean up
  const leaveRoom = useCallback(async () => {
    try {
      if (roomRef.current && roomRef.current.state !== ConnectionState.Disconnected) {
        await roomRef.current.disconnect();
      }
      setConnectionState(ConnectionState.Disconnected);
      setToken(null);
      setParticipantCount(0);
    } catch (err) {
      console.warn("[useLiveKitRoom Disconnect Note]", err);
    }
  }, []);

  // Auto-connect once on mount
  useEffect(() => {
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom();
    }
  }, [joinRoom]);

  // Cleanup only on true unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (e) {}
        roomRef.current = null;
      }
    };
  }, []);

  return {
    room: roomRef.current,
    token,
    wsUrl,
    roomName,
    isConfigured,
    connectionState,
    isConnected: connectionState === ConnectionState.Connected,
    isConnecting: connectionState === ConnectionState.Connecting,
    errorMsg,
    participantCount,
    joinRoom,
    leaveRoom,
  };
}
