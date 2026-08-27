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
  const [participantCount, setParticipantCount] = useState<number>(0);

  const roomRef = useRef<Room | null>(null);

  // Initialize or get the LiveKit room instance
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
          onConnected?.();
        } else if (state === ConnectionState.Disconnected) {
          onDisconnected?.();
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
  }, [onConnected, onDisconnected]);

  // Join Room by fetching token and connecting
  const joinRoom = useCallback(async () => {
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

      // If LiveKit credentials are configured, connect to live WebSocket server
      if (data.isConfigured && data.wsUrl && !data.wsUrl.includes("demo.livekit.cloud")) {
        await room.connect(data.wsUrl, data.token);
        setParticipantCount(room.numParticipants);
      } else {
        // Local simulation / demo mode: Mark as connected
        setConnectionState(ConnectionState.Connected);
        setParticipantCount(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to LiveKit room";
      console.error("[useLiveKitRoom Error]", err);
      setErrorMsg(msg);
      setConnectionState(ConnectionState.Disconnected);
      if (err instanceof Error) {
        onError?.(err);
      }
    }
  }, [meetingId, participantName, getRoom, onError]);

  // Leave Room & Disconnect
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
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
