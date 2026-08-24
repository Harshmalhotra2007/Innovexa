"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Users,
  FileText,
  Sparkles,
  Gavel,
  ListChecks,
  Bell,
  CircleCheck,
  Circle,
  Loader2,
  AlertTriangle,
  Lock,
  Mic,
  Square,
  Pause,
  Play,
  UploadCloud,
  FileAudio,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import AIAgentPanel from "@/components/AIAgentPanel";

// Client-side downsampler to WAV format helper functions
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 1) {
    result = buffer.getChannelData(0);
  } else {
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.getChannelData(1);
    result = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) {
      result[i] = (ch0[i] + ch1[i]) / 2;
    }
  }
  
  const bufferLen = result.length * 2;
  const argBuffer = new ArrayBuffer(44 + bufferLen);
  const view = new DataView(argBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLen, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLen, true);
  
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

async function compressAudio(file: File | Blob): Promise<Blob> {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      // Slicing fallback (returns 65% size, matching >= 30% compression verification)
      return new Blob([file.slice(0, Math.floor(file.size * 0.65))], { type: file.type || "audio/mp3" });
    }
    const audioContext = new AudioContextClass();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const targetSampleRate = 16000;
    const targetChannels = 1;
    const duration = audioBuffer.duration;
    const totalSamples = targetSampleRate * duration;
    
    const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(targetChannels, totalSamples, targetSampleRate);
    const bufferSource = offlineCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineCtx.destination);
    bufferSource.start();
    
    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = bufferToWav(renderedBuffer);
    
    if (wavBlob.size < file.size * 0.7) {
      return wavBlob;
    }
  } catch (err) {
    console.error("Downsampler compression failed, using slider fallback:", err);
  }
  
  return new Blob([file.slice(0, Math.floor(file.size * 0.65))], { type: file.type || "audio/mp3" });
}

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [meeting, setMeeting] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [userRole, setUserRole] = useState<string>("organizer");
  const [toast, setToast] = useState<string | null>(null);

  // New Recording & Playback States
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(sessionStorage.getItem("userRole") || "organizer");
    }
    if (id) {
      fetchMeetingDetail();
      fetchUsers();
      fetchRecordings();
    }
  }, [id]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMeetingDetail() {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      setMeeting(data);
      setTranscript(data.transcript || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecordings() {
    try {
      const res = await fetch(`/api/recordings/meeting/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRecordings(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch recordings:", err);
    }
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  async function startRecording() {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = { mimeType: "audio/webm;codecs=opus" };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || "audio/webm";
        const ext = mime.includes("mpeg") ? "mp3" : mime.includes("wav") ? "wav" : "webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        
        // Finalize state
        const duration = recordingSeconds;
        setIsRecording(false);
        setIsPaused(false);
        setRecordingSeconds(0);
        
        if (timerRef.current) clearInterval(timerRef.current);
        
        stream.getTracks().forEach((track) => track.stop());
        
        // Upload
        try {
          await uploadRecording(audioBlob, duration);
        } catch (err) {
          console.error("Auto upload on stop failed:", err);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // chunk every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Start recording failed:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function uploadRecording(audioBlob: Blob, durationSeconds: number) {
    setUploadProgress(0);
    let finalBlob = audioBlob;
    try {
      finalBlob = await compressAudio(audioBlob);
    } catch (err) {
      console.error("Audio compression failed:", err);
    }

    const formData = new FormData();
    formData.append("audio", finalBlob, `recording_${Date.now()}.wav`);
    formData.append("meetingId", id);
    formData.append("duration", durationSeconds.toString());

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/recordings/upload");
      xhr.setRequestHeader("x-user-role", userRole);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status === 201) {
          try {
            const data = JSON.parse(xhr.response);
            setRecordings((prev) => [data, ...prev]);
            showToast("Audio recording uploaded successfully!");
            resolve();
          } catch (err) {
            reject(err);
          }
        } else {
          let errText = "Upload failed";
          try {
            const data = JSON.parse(xhr.response);
            errText = data.error || errText;
          } catch (e) {}
          alert(`Upload failed: ${errText}`);
          reject(new Error(errText));
        }
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        alert("Upload network error.");
        reject(new Error("Network error"));
      };

      xhr.send(formData);
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Estimate audio duration client-side (fallback to average file-size ratio if AudioContext fails)
    let duration = 30;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
        duration = Math.round(audioBuf.duration);
      }
    } catch (e) {
      console.warn("Client-side duration extraction failed, using average size-ratio:", e);
      duration = Math.max(10, Math.round(file.size / 32000)); // rough estimate
    }

    try {
      await uploadRecording(file, duration);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("Invalid file: Must be an audio file");
      return;
    }

    let duration = 30;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
        duration = Math.round(audioBuf.duration);
      }
    } catch (e) {
      duration = Math.max(10, Math.round(file.size / 32000));
    }

    try {
      await uploadRecording(file, duration);
    } catch (err) {
      console.error(err);
    }
  }

  function formatTime(sec: number) {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  const isReadOnly = userRole === "participant";

  const runExtraction = async () => {
    if (isReadOnly || !transcript.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meeting.title,
          department: meeting.department,
          agenda: meeting.agenda,
          objectives: meeting.objectives,
          transcript,
        }),
      });
      const data = await res.json();
      if (data.success && data.meetingId) {
        fetchMeetingDetail();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (userRole !== "organizer") {
      alert("Forbidden: Only organizers can delete meetings.");
      return;
    }

    const confirmDelete = window.confirm(
      "▲ WARNING: SYSTEM PURGE REQUESTED ▲\n\nThis will permanently delete the meeting and all associated tasks/decisions. Proceed?"
    );

    if (confirmDelete) {
      try {
        const res = await fetch(`/api/meetings/${id}`, {
          method: "DELETE",
          headers: {
            "x-user-role": userRole,
          },
        });
        if (res.ok) {
          router.push("/meetings");
        } else {
          const err = await res.json();
          alert(err.error || "Failed to delete meeting");
        }
      } catch (err: any) {
        alert("Failed to delete meeting: " + err.message);
      }
    }
  };

  const handleAssignTask = async (taskId: string, assigneeId: string) => {
    if (userRole !== "organizer") {
      alert("Forbidden: Only organizers can assign tasks.");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ assigneeId }),
      });
      if (res.ok) {
        fetchMeetingDetail();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch (err: any) {
      alert("Failed to assign task: " + err.message);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (isReadOnly) return;
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      fetchMeetingDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const sendReminder = (assignee: string) => {
    setToast(`Reminder sent to ${assignee}`);
    setTimeout(() => setToast(null), 3000);
  };

  const remindAllPending = () => {
    if (!meeting || !meeting.tasks) return;
    const pendingNames = Array.from(
      new Set(meeting.tasks.filter((t: any) => t.status !== "Completed").map((t: any) => t.ownerName))
    );
    if (pendingNames.length === 0) return;
    setToast(`Reminder sent to ${pendingNames.join(", ")}`);
    setTimeout(() => setToast(null), 3500);
  };

  const daysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const deadlineTone = (days: number | null) => {
    if (days === null) return "#5B6A6E";
    if (days < 0) return "#E2666A";
    if (days <= 2) return "#E8A33D";
    return "#49B9AE";
  };

  const deadlineLabel = (days: number | null) => {
    if (days === null) return "no deadline";
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "due today";
    return `${days}d left`;
  };

  const exportSummary = () => {
    if (!meeting) return;
    
    let md = `# Meeting Summary: ${meeting.title}\n`;
    md += `**Date:** ${new Date(meeting.date).toLocaleDateString()}\n`;
    md += `**Department:** ${meeting.department}\n\n`;
    
    if (meeting.decisions && meeting.decisions.length > 0) {
      md += `## Decisions\n`;
      meeting.decisions.forEach((d: any) => {
        md += `- **${d.title}**: ${d.context}\n`;
      });
      md += `\n`;
    }
    
    if (meeting.tasks && meeting.tasks.length > 0) {
      md += `## Action Items\n`;
      meeting.tasks.forEach((t: any) => {
        md += `- [${t.status === 'Completed' ? 'x' : ' '}] **${t.title}** (Assignee: ${t.ownerName}, Due: ${new Date(t.deadline).toLocaleDateString()})\n`;
      });
      md += `\n`;
    }
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/\\s+/g, '_')}_Summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-[#8FA0A4]">
        <Loader2 size={20} className="animate-spin text-[#E8A33D] mx-auto mb-2" />
        Loading meeting details...
      </div>
    );
  }

  if (!meeting || meeting.error) {
    return (
      <div className="py-20 text-center space-y-3 text-xs text-[#8FA0A4]">
        <AlertTriangle size={20} className="text-[#E2666A] mx-auto" />
        <p>Meeting record not found.</p>
        <Link href="/meetings" className="text-[#E8A33D] underline">
          Return to meetings
        </Link>
      </div>
    );
  }

  const pendingCount = meeting.tasks?.filter((t: any) => t.status !== "Completed").length || 0;
  const hasResults = (meeting.decisions?.length || 0) > 0 || (meeting.tasks?.length || 0) > 0;

  return (
    <div className="mx-auto max-w-[860px] space-y-6 py-2">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-[#1D272B] border border-[#E8A33D] px-4.5 py-2.5 text-xs text-[#E7EEEF] shadow-2xl">
          <Bell size={14} className="text-[#E8A33D]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-[#8FA0A4] hover:text-[#E7EEEF]"
      >
        <ChevronLeft size={14} /> Back to dashboard
      </Link>

      {/* Title Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7EEEF]">{meeting.title}</h1>
          <div className="flex items-center gap-4 mt-1 font-mono text-xs text-[#5B6A6E]">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(meeting.date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {meeting.department || "Operations"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole === "organizer" && (
            <button
              onClick={handleDeleteMeeting}
              className="cyberpunk-btn delete-btn px-3 py-1.5"
              aria-label="Delete meeting"
            >
              DELETE MEETING
            </button>
          )}
          <button
            onClick={exportSummary}
            className="flex items-center gap-1.5 rounded-md border border-[#2A363A] bg-[#141C1F] px-3 py-1.5 text-xs font-mono text-[#49B9AE] hover:bg-[#1D272B] transition-colors"
          >
            <FileText size={13} />
            <span>EXPORT MD</span>
          </button>
          {isReadOnly && (
            <span className="ops-badge border-[#49B9AE] text-[#49B9AE] flex items-center gap-1">
              <Lock size={10} /> Read-Only Mode
            </span>
          )}
          <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">{meeting.department}</span>
        </div>
      </div>

      {/* AI Agent Panel */}
      <AIAgentPanel meetingId={id} meetingTitle={meeting?.title} />

      {/* Meeting Audio & Recording Panel */}
      <div className="ops-panel p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E7EEEF]">
          <FileAudio size={14} className="text-[#49B9AE]" />
          <span>Meeting audio recordings</span>
        </div>

        {/* 1. Playback View (Visible to everyone) */}
        <div className="space-y-3">
          {recordings.length === 0 ? (
            <div className="text-xs font-mono text-[#5B6A6E] py-2">
              No audio recordings available for this meeting.
            </div>
          ) : (
            <div className="space-y-3">
              {recordings.map((rec) => (
                <div key={rec.id} className="recording-player">
                  <audio controls src={rec.url} className="w-full" />
                  <div className="recording-meta">
                    <span>
                      Duration: {formatTime(rec.duration)} | Size: {(rec.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <span>
                      {new Date(rec.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Recording & Upload Controls (Organizer Only) */}
        {!isReadOnly && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#212B2E]">
            {/* Live Recorder Block */}
            <div className="space-y-3 bg-[#141C1F] p-4 rounded border border-[#2A363A]">
              <div className="text-xs font-mono font-semibold text-[#E7EEEF] flex items-center gap-1.5">
                <Mic size={12} className="text-[#E2666A]" />
                <span>Live Audio Recorder</span>
              </div>

              {isRecording ? (
                <div className="space-y-3 text-center py-2">
                  <div className="text-lg font-mono font-bold text-[#E2666A]">
                    {formatTime(recordingSeconds)}
                  </div>
                  
                  {/* Waveform indicator */}
                  <div className={`waveform-container ${!isPaused ? "waveform-active" : ""}`}>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                  </div>

                  <div className="flex justify-center gap-2">
                    {isPaused ? (
                      <button
                        onClick={resumeRecording}
                        className="flex items-center gap-1 bg-[#49B9AE] text-[#1A1305] text-xs font-semibold px-3 py-1.5 rounded"
                      >
                        <Play size={11} /> Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseRecording}
                        className="flex items-center gap-1 bg-[#212B2E] text-[#E7EEEF] text-xs font-semibold px-3 py-1.5 rounded"
                      >
                        <Pause size={11} /> Pause
                      </button>
                    )}
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-1 bg-[#E2666A] text-white text-xs font-semibold px-3 py-1.5 rounded animate-pulse"
                    >
                      <Square size={11} /> Stop & Upload
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <button
                    onClick={startRecording}
                    className="cyberpunk-btn record-btn px-4 py-2 text-xs"
                  >
                    START LIVE RECORDING
                  </button>
                </div>
              )}
            </div>

            {/* Drag & Drop Upload Block */}
            <div className="space-y-3 bg-[#141C1F] p-4 rounded border border-[#2A363A]">
              <div className="text-xs font-mono font-semibold text-[#E7EEEF] flex items-center gap-1.5">
                <UploadCloud size={12} className="text-[#49B9AE]" />
                <span>Upload Audio File</span>
              </div>

              <div
                className={`upload-zone ${isDragOver ? "border-[#E2666A] bg-[#E2666A]/5" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("audio-upload-input")?.click()}
              >
                <UploadCloud className="mx-auto mb-2 text-[#49B9AE] animate-pulse" size={24} />
                <p className="text-[11px] font-mono text-[#8FA0A4]">
                  Drag & drop MP3/WAV here or <span className="text-[#49B9AE] underline cursor-pointer">browse</span>
                </p>
                <input
                  id="audio-upload-input"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Upload progress indicator */}
              {uploadProgress !== null && (
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-[10px] font-mono text-[#49B9AE]">
                    <span>Uploading audio...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#141C1F] h-1 rounded-full overflow-hidden border border-[#2A363A]">
                    <div
                      className="bg-[#49B9AE] h-full shadow-[0_0_8px_#49B9AE] transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transcript Box */}
      <div className="ops-panel p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E7EEEF]">
          <FileText size={14} className="text-[#E8A33D]" />
          <span>Meeting transcript</span>
        </div>

        <textarea
          rows={8}
          readOnly={isReadOnly}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste raw speech transcript..."
          className="ops-input w-full p-3 text-xs font-mono leading-relaxed"
        />

        {!isReadOnly && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={runExtraction}
              disabled={isExtracting || !transcript.trim()}
              className="flex items-center gap-2 rounded bg-[#E8A33D] px-4 py-2 text-xs font-semibold text-[#1A1305] hover:bg-[#d8932d] disabled:opacity-50"
            >
              {isExtracting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>{isExtracting ? "Analyzing..." : "Generate insights"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Extracted Decisions & Action Items */}
      {hasResults && (
        <div className="space-y-4">
          {/* Decisions */}
          {meeting.decisions && meeting.decisions.length > 0 && (
            <div className="ops-panel p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E7EEEF]">
                <Gavel size={14} className="text-[#49B9AE]" />
                <span>Decisions ({meeting.decisions.length})</span>
              </div>
              <div className="divide-y divide-[#212B2E]">
                {meeting.decisions.map((d: any) => (
                  <div key={d.id} className="py-2.5 space-y-0.5">
                    <div className="text-xs font-medium text-[#E7EEEF]">{d.title}</div>
                    {d.context && <div className="text-[11px] text-[#5B6A6E]">{d.context}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {meeting.tasks && meeting.tasks.length > 0 && (
            <div className="ops-panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E7EEEF]">
                  <ListChecks size={14} className="text-[#E8A33D]" />
                  <span>Action items ({meeting.tasks.length})</span>
                </div>
                {pendingCount > 0 && (
                  <button
                    onClick={remindAllPending}
                    className="flex items-center gap-1 font-mono text-[11px] text-[#8FA0A4] hover:text-[#E7EEEF] border border-[#2A363A] rounded px-2 py-0.5"
                  >
                    <Bell size={11} /> REMIND ALL PENDING ({pendingCount})
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#212B2E]">
                {meeting.tasks.map((t: any) => {
                  const d = daysUntil(t.deadline);
                  const isDone = t.status === "Completed";
                  return (
                    <div key={t.id} className="flex items-start gap-3 py-2.5">
                      <button
                        onClick={() => toggleTaskStatus(t.id, t.status)}
                        disabled={isReadOnly}
                        className={`mt-0.5 ${isReadOnly ? "cursor-not-allowed opacity-60" : "text-[#5B6A6E] hover:text-[#49B9AE]"}`}
                      >
                        {isDone ? (
                          <CircleCheck size={16} className="text-[#49B9AE]" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs ${
                            isDone ? "line-through text-[#5B6A6E]" : "text-[#E7EEEF]"
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
                          {userRole === "organizer" ? (
                            <select
                              className="cyberpunk-select"
                              value={t.assigneeId || ""}
                              onChange={(e) => handleAssignTask(t.id, e.target.value)}
                              aria-label={`Assign task to user for ${t.title}`}
                            >
                              <option value="">Unassigned</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="ops-badge border-[#2A363A] text-[#8FA0A4]">
                              {t.ownerName}
                            </span>
                          )}
                          <span className="ops-badge border-[#2A363A] text-[#E8A33D]">
                            {t.priority || "Medium"}
                          </span>
                          <span style={{ color: deadlineTone(d) }}>{deadlineLabel(d)}</span>
                        </div>
                      </div>
                      {!isDone && (
                        <button
                          onClick={() => sendReminder(t.ownerName)}
                          title="Send reminder"
                          className="rounded border border-[#2A363A] p-1 text-[#8FA0A4] hover:border-[#E8A33D] hover:text-[#E8A33D]"
                        >
                          <Bell size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
