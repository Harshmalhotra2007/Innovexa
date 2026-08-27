"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Video,
  Users,
  Building2,
  FileText,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ScheduleMeetingModal({ isOpen, onClose, onSuccess }: ScheduleMeetingModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [department, setDepartment] = useState("Engineering");
  const [agenda, setAgenda] = useState("");
  const [objectives, setObjectives] = useState("");
  const [participants, setParticipants] = useState("");
  const [googleMeetLink, setGoogleMeetLink] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate instant client preview Google Meet link upon modal opening
  useEffect(() => {
    if (isOpen && !googleMeetLink) {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const p1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const p3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      setGoogleMeetLink(`https://meet.google.com/${p1}-${p2}-${p3}`);
    }
  }, [isOpen, googleMeetLink]);

  // Fetch available slots whenever scheduledDate changes
  useEffect(() => {
    if (!isOpen || !scheduledDate) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/meetings/available-slots?date=${scheduledDate}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.availableSlots || []);
          if (data.availableSlots && data.availableSlots.length > 0) {
            setSelectedSlot(data.availableSlots[0]);
          } else {
            setSelectedSlot("");
          }
        }
      } catch (err) {
        console.warn("Error fetching available slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [isOpen, scheduledDate]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (googleMeetLink) {
      navigator.clipboard.writeText(googleMeetLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a meeting title.");
      return;
    }
    if (!selectedSlot) {
      setError("Please select an available time slot.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/meetings/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          scheduledDate,
          timeSlot: selectedSlot,
          durationMinutes,
          department,
          agenda,
          objectives,
          participants,
          googleMeetLink,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to schedule meeting");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to schedule meeting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-[#000] bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141C1F] border border-[#212B2E] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-[#e8e1d5] font-sans my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212B2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8A33D]/10 border border-[#E8A33D]/30 text-[#E8A33D]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base tracking-wider uppercase text-[#e8e1d5]">
                SCHEDULE A NEW AI MEETING
              </h2>
              <p className="font-mono text-[11px] text-[#9a99a0]">
                Auto-generates Google Meet URL & registers AI Notetaker for scheduled join.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg bg-[#182124] text-[#9a99a0] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-[#E2666A]/10 border border-[#E2666A]/40 text-[#E2666A] font-mono text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Meeting Title */}
          <div className="space-y-1">
            <label className="text-[#9a99a0] font-bold uppercase tracking-wider block">
              MEETING TITLE <span className="text-[#E2666A]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Product Roadmap & Architecture Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#182124] border border-[#2B383C] text-xs font-mono text-[#E7EEEF] placeholder-[#5B6A6E] focus:outline-none focus:border-[#E8A33D]"
            />
          </div>

          {/* Date & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheduled Date */}
            <div className="space-y-1">
              <label className="text-[#9a99a0] font-bold uppercase tracking-wider block">
                MEETING DATE <span className="text-[#E2666A]">*</span>
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#182124] border border-[#2B383C] text-xs font-mono text-[#E7EEEF] focus:outline-none focus:border-[#E8A33D]"
              />
            </div>

            {/* Duration Selector */}
            <div className="space-y-1">
              <label className="text-[#9a99a0] font-bold uppercase tracking-wider block">
                DURATION (MINUTES)
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                {[15, 30, 45, 60].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setDurationMinutes(dur)}
                    className={`flex-1 py-2 rounded font-bold uppercase transition-all ${
                      durationMinutes === dur
                        ? "bg-[#E8A33D] text-[#1a1f2d] border border-[#E8A33D]"
                        : "bg-[#182124] text-[#9a99a0] border border-[#2B383C] hover:text-white"
                    }`}
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Slot Selection */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[#182124] border border-[#212B2E]">
            <label className="text-[#49B9AE] font-bold uppercase tracking-wider flex items-center justify-between">
              <span>AVAILABLE TIME SLOTS ({scheduledDate})</span>
              {loadingSlots && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </label>
            {availableSlots.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-1.5 rounded font-bold transition-all ${
                      selectedSlot === slot
                        ? "bg-[#49B9AE] text-[#0D1A18] border border-[#49B9AE] shadow-md shadow-[#49B9AE]/20"
                        : "bg-[#141C1F] text-[#9a99a0] border border-[#2B383C] hover:text-white"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[#5B6A6E] py-2">
                {loadingSlots ? "Querying available slots..." : "No available slots on this date. Select another date."}
              </div>
            )}
          </div>

          {/* Department & Participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[#9a99a0] font-bold uppercase tracking-wider block">
                DEPARTMENT / TEAM
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#182124] border border-[#2B383C] text-xs font-mono text-[#E7EEEF] focus:outline-none focus:border-[#E8A33D]"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Executive">Executive</option>
                <option value="Design">Design</option>
                <option value="Sales">Sales</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#9a99a0] font-bold uppercase tracking-wider block">
                PARTICIPANT EMAILS
              </label>
              <input
                type="text"
                placeholder="alice@innovexa.com, bob@innovexa.com"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#182124] border border-[#2B383C] text-xs font-mono text-[#E7EEEF] placeholder-[#5B6A6E] focus:outline-none focus:border-[#E8A33D]"
              />
            </div>
          </div>

          {/* Agenda & Objectives */}
          <div className="space-y-1">
            <label className="text-[#9a99a0] font-bold uppercase tracking-wider block">
              AGENDA & MEETING OBJECTIVES (OPTIONAL)
            </label>
            <textarea
              rows={2}
              placeholder="Outline meeting goals, topics, or background context for AI synthesis..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#182124] border border-[#2B383C] text-xs font-mono text-[#E7EEEF] placeholder-[#5B6A6E] focus:outline-none focus:border-[#E8A33D]"
            />
          </div>

          {/* Auto-Generated Google Meet URL Preview */}
          <div className="p-3 rounded-lg bg-[#182124] border border-[#212B2E] space-y-1">
            <div className="text-[10px] text-[#49B9AE] font-bold uppercase tracking-wider flex items-center justify-between">
              <span>AUTO-GENERATED GOOGLE MEET URL</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs text-[#9a99a0] hover:text-[#49B9AE] flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#49B9AE]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "COPIED" : "COPY"}</span>
              </button>
            </div>
            <div className="text-xs text-[#E8A33D] font-bold truncate flex items-center gap-1.5">
              <Video className="w-4 h-4 flex-shrink-0" />
              <span>{googleMeetLink}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#212B2E]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#182124] text-[#9a99a0] hover:text-white font-mono text-xs font-bold uppercase"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-[#E8A33D] text-[#1a1f2d] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#c98a2d] transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-[#E8A33D]/20"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>SCHEDULE MEETING</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
