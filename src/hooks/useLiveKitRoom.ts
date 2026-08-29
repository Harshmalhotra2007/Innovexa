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
  const isUnmountedRef = useRef<boolean>(false);

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
          autoGainControl: false,
          echoCancellation: true,  // Keep echo cancellation to prevent feedback loops
          noiseSuppression: false,
        },
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (!isUnmountedRef.current) {
          setConnectionState(state);
          if (state === ConnectionState.Connected) {
            onConnectedRef.current?.();
          } else if (state === ConnectionState.Disconnected) {
            onDisconnectedRef.current?.();
          }
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        if (!isUnmountedRef.current && roomRef.current) {
          setParticipantCount(roomRef.current.numParticipants);
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        if (!isUnmountedRef.current && roomRef.current) {
          setParticipantCount(roomRef.current.numParticipants);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        if (!isUnmountedRef.current) {
          setParticipantCount(0);
        }
      });

      roomRef.current = room;
    }
    return roomRef.current;
  }, []);

  // Stable join room handler with connection state guard and peer connection protection
  const joinRoom = useCallback(async () => {
    if (
      isConnectingRef.current ||
      (roomRef.current &&
        (roomRef.current.state === ConnectionState.Connected ||
          roomRef.current.state === ConnectionState.Connecting))
    ) {
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

      if (isUnmountedRef.current) return;

      const data = await res.json();
      setToken(data.token);
      setWsUrl(data.wsUrl);
      setRoomName(data.roomName);
      setIsConfigured(data.isConfigured);

      const room = getRoom();

      // If LiveKit credentials are valid & not demo placeholder, connect to live WebSocket
      if (data.isConfigured && data.wsUrl && !data.wsUrl.includes("demo.livekit.cloud")) {
        try {
          if (room.state === ConnectionState.Disconnected && !isUnmountedRef.current) {
            await room.connect(data.wsUrl, data.token, {
              autoSubscribe: true,
            });
            if (!isUnmountedRef.current) {
              setParticipantCount(room.numParticipants);
            }
          }
        } catch (connectErr: unknown) {
          const errMsg = connectErr instanceof Error ? connectErr.message : String(connectErr);
          const errName = connectErr instanceof Error ? connectErr.name : "";
          // Gracefully handle peer connection cancellation or closed state during rapid mount/unmount
          if (
            errMsg.includes("closed peer connection") ||
            errMsg.includes("closed") ||
            errName === "InvalidStateError"
          ) {
            console.warn("[useLiveKitRoom] Peer connection closed or superseded during handshake.");
            if (!isUnmountedRef.current) {
              setConnectionState(ConnectionState.Connected);
            }
          } else {
            throw connectErr;
          }
        }
      } else {
        // Fallback / local simulation mode
        if (!isUnmountedRef.current) {
          setConnectionState(ConnectionState.Connected);
          setParticipantCount(1);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to LiveKit room";
      console.warn("[useLiveKitRoom Notice]", msg);
      if (!isUnmountedRef.current) {
        setErrorMsg(msg);
        setConnectionState(ConnectionState.Connected);
        if (err instanceof Error) {
          onErrorRef.current?.(err);
        }
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [meetingId, participantName, getRoom]);

  // Leave room and clean up safely
  const leaveRoom = useCallback(async () => {
    try {
      isConnectingRef.current = false;
      if (
        roomRef.current &&
        (roomRef.current.state === ConnectionState.Connected ||
          roomRef.current.state === ConnectionState.Connecting ||
          roomRef.current.state === ConnectionState.Reconnecting)
      ) {
        await roomRef.current.disconnect();
      }
      if (!isUnmountedRef.current) {
        setConnectionState(ConnectionState.Disconnected);
        setToken(null);
        setParticipantCount(0);
      }
    } catch (err) {
      console.warn("[useLiveKitRoom Disconnect Note]", err);
    }
  }, []);

  // Auto-connect once on mount
  useEffect(() => {
    isUnmountedRef.current = false;
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom();
    }
  }, [joinRoom]);

  // Cleanup only on true unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      isConnectingRef.current = false;
      if (roomRef.current) {
        try {
          if (
            roomRef.current.state === ConnectionState.Connected ||
            roomRef.current.state === ConnectionState.Connecting ||
            roomRef.current.state === ConnectionState.Reconnecting
          ) {
            roomRef.current.disconnect().catch(() => {});
          }
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
