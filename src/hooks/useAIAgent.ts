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

export interface ActionItemData {
  id?: string;
  meetingId?: string;
  task: string;
  title?: string;
  assignee?: string;
  ownerName?: string;
  dueDate?: string | null;
  deadline?: string | Date | null;
  status?: string;
  priority?: string;
  description?: string;
}

export interface CitationData {
  id?: string;
  meetingId?: string;
  transcriptChunkId: string;
  confidence: number;
  createdAt?: string;
  snippet?: string;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [subIndex: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognitionInstance;

interface WindowWithSpeechRec extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function useAIAgent(meetingId: string) {
  const [agent, setAgent] = useState<AIAgentData>({
    meetingId,
    status: "idle",
  });
  const [actionItems, setActionItems] = useState<ActionItemData[]>([]);
  const [citations, setCitations] = useState<CitationData[]>([]);
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("organizer");
  const [customMeetUrl, setCustomMeetUrl] = useState("");
  const [audioQuality, setAudioQuality] = useState<"high" | "medium" | "low">("medium");

  // Live Tab Audio Capture State
  const [isTabRecording, setIsTabRecording] = useState(false);
  const [tabRecordSeconds, setTabRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-agent/status/${meetingId}`);
      if (res.ok) {
        const data: AIAgentData = await res.json();
        setAgent(data);
      }
    } catch {
      // Ignore network errors in background polling
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
      // Ignore network errors in background polling
    }
  }, [meetingId]);

  const fetchCitations = useCallback(async () => {
    try {
      const res = await fetch(`/api/citations?meetingId=${meetingId}`);
      if (res.ok) {
        const data: CitationData[] = await res.json();
        setCitations(data);
      }
    } catch (err: unknown) {
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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors on unmount
        }
        recognitionRef.current = null;
      }
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

      const data: AIAgentData = await res.json();
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload audio recording.";
      console.error("Tab audio upload error:", err);
      setErrorMsg(message);
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
          } as MediaTrackConstraints,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Initialize Browser Native SpeechRecognition for immediate real-time live captions
      if (typeof window !== "undefined") {
        const win = window as WindowWithSpeechRec;
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = false;

            recognition.onresult = (event: ISpeechRecognitionEvent) => {
              const current = event.resultIndex;
              const text = event.results[current]?.[0]?.transcript;
              if (text && text.trim().length > 0) {
                const cleanText = text.trim();
                const nowSecs = tabRecordSeconds;
                const mins = Math.floor(nowSecs / 60);
                const secs = nowSecs % 60;
                const timestamp = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

                const liveSeg: TranscriptSegment = {
                  speaker: "Presenter (Live)",
                  text: cleanText,
                  timestamp,
                };

                setAgent((prev) => ({
                  ...prev,
                  transcript: [...(prev.transcript || []), liveSeg],
                }));

                // Post live recognized text to whisper route for DB persistence
                fetch("/api/whisper/transcribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    meetingId,
                    speakerHint: "Presenter (Live)",
                    text: cleanText,
                  }),
                }).catch(() => {});
              }
            };

            recognition.onerror = (e: { error: string }) => console.warn("[AIAgent SpeechRec Note]", e.error);
            recognition.start();
            recognitionRef.current = recognition;
          } catch (recErr: unknown) {
            console.warn("[AIAgent SpeechRec Init Note]", recErr);
          }
        }
      }

      const targetBitrate = audioQuality === "high" ? 128000 : audioQuality === "low" ? 32000 : 64000;
      const recorder = new MediaRecorder(stream, { audioBitsPerSecond: targetBitrate });
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
          formData.append("speakerHint", "Presenter");

          fetch("/api/recordings/stream-chunk", {
            method: "POST",
            body: formData,
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data.segment && data.segment.text && data.segment.text.trim().length > 0) {
                  setAgent((prev) => {
                    const exists = (prev.transcript || []).some((t) => t.text === data.segment.text);
                    if (exists) return prev;
                    return {
                      ...prev,
                      transcript: [...(prev.transcript || []), data.segment],
                    };
                  });
                }
              }
            })
            .catch(() => {});
        }
      };

      recorder.onstop = async () => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
          recognitionRef.current = null;
        }

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
    } catch (err: unknown) {
      console.error("Tab audio capture error:", err);
      setErrorMsg("Could not capture tab audio. Please grant screen/audio permissions.");
    }
  };

  const stopTabAudioCapture = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
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
    setAgent((prev) => ({ ...prev, status: "completed" }));

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error ending meeting";
      setErrorMsg(msg);
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
    audioQuality,
    setAudioQuality,
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
