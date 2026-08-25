"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface AIAgentData {
  id?: string;
  meetingId: string;
  status: "idle" | "joining" | "recording" | "transcribing" | "summarizing" | "completed";
  joinedAt?: string;
  recordingUrl?: string;
  transcript?: TranscriptSegment[];
  summary?: string;
}

export function useAIAgent(meetingId: string) {
  const [agent, setAgent] = useState<AIAgentData>({
    meetingId,
    status: "idle",
  });
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [citations, setCitations] = useState<any[]>([]);
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("organizer");
  const [customMeetUrl, setCustomMeetUrl] = useState("");

  // Live Tab Audio Capture State
  const [isTabRecording, setIsTabRecording] = useState(false);
  const [tabRecordSeconds, setTabRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-agent/status/${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
      }
    } catch {
      // Ignore
    }
  }, [meetingId]);

  const fetchActionItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/recordings/meeting/${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setActionItems(data.actionItems || []);
      }
    } catch {
      // Ignore
    }
  }, [meetingId]);

  const fetchCitations = useCallback(async () => {
    try {
      const res = await fetch(`/api/citations?meetingId=${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setCitations(data);
      }
    } catch (err) {
      console.warn("[useAIAgent] Mapped citations not found yet:", err);
    }
  }, [meetingId]);

  useEffect(() => {
    const role = sessionStorage.getItem("userRole") || "organizer";
    setUserRole(role);

    fetchStatus();
    fetchActionItems();
    fetchCitations();

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [meetingId, fetchStatus, fetchActionItems, fetchCitations]);

  const handleManagedBotJoin = async () => {
    if (userRole !== "organizer") {
      setErrorMsg("Forbidden: Must be logged in as an Organizer.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      let res = await fetch("/api/meeting-baas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ meetingId, meetingUrl: customMeetUrl.trim() || undefined }),
      });

      if (!res.ok) {
        res = await fetch("/api/ai-agent/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userRole,
          },
          body: JSON.stringify({ meetingId, meetingUrl: customMeetUrl.trim() || undefined, useManagedBot: true }),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to trigger AI Agent");
      }

      const data = await res.json();
      setAgent(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error joining meeting";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const uploadAndProcessTabAudio = async (audioBlob: Blob) => {
    setAgent((prev) => ({ ...prev, status: "transcribing" }));
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `meeting_tab_${Date.now()}.webm`);
      formData.append("meetingId", meetingId);

      const res = await fetch("/api/recordings/upload", {
        method: "POST",
        headers: { "x-user-role": userRole },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process audio recording");
      }

      const data = await res.json();
      setAgent(data.agent || data);
      await fetchStatus();
      await fetchActionItems();
      await fetchCitations();
    } catch (err: any) {
      console.error("Tab audio upload error:", err);
      setErrorMsg(err.message || "Failed to upload audio recording.");
      setAgent((prev) => ({ ...prev, status: "idle" }));
    }
  };

  const startTabAudioCapture = async () => {
    setErrorMsg(null);
    try {
      audioChunksRef.current = [];
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          } as any,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      let chunkIndex = 0;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // Progressive Upload: Stream audio chunk to backend in real-time
          const currentChunkIndex = chunkIndex++;
          const formData = new FormData();
          formData.append("chunk", event.data, `chunk_${currentChunkIndex}.webm`);
          formData.append("meetingId", meetingId);
          formData.append("chunkIndex", currentChunkIndex.toString());

          fetch("/api/recordings/stream-chunk", {
            method: "POST",
            body: formData,
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data.segment) {
                  setAgent((prev) => ({
                    ...prev,
                    transcript: [...(prev.transcript || []), data.segment],
                  }));
                }
              }
            })
            .catch(() => {});
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        setIsTabRecording(false);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);

        await uploadAndProcessTabAudio(audioBlob);
      };

      recorder.start(1000);
      setIsTabRecording(true);
      setTabRecordSeconds(0);
      setAgent((prev) => ({ ...prev, status: "recording" }));

      recordTimerRef.current = setInterval(() => {
        setTabRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Tab audio capture error:", err);
      setErrorMsg("Could not capture tab audio. Please grant screen/audio permissions.");
    }
  };

  const stopTabAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleEndMeeting = async () => {
    if (isTabRecording) {
      stopTabAudioCapture();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setAgent((prev: any) => ({ ...prev, status: "completed" }));

    try {
      await Promise.all([
        fetch("/api/ai-agent/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId }),
        }).catch(() => {}),
        fetch("/api/meeting-baas/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId }),
        }).catch(() => {}),
      ]);

      await fetchStatus();
      await fetchActionItems();
      await fetchCitations();
    } catch (err: any) {
      setErrorMsg(err.message || "Error ending meeting");
    } finally {
      setLoading(false);
    }
  };

  return {
    agent,
    actionItems,
    citations,
    highlightedChunkIndex,
    setHighlightedChunkIndex,
    loading,
    errorMsg,
    userRole,
    customMeetUrl,
    setCustomMeetUrl,
    isTabRecording,
    tabRecordSeconds,
    handleManagedBotJoin,
    handleEndMeeting,
    startTabAudioCapture,
    stopTabAudioCapture,
    fetchStatus,
    fetchActionItems,
    fetchCitations,
  };
}
