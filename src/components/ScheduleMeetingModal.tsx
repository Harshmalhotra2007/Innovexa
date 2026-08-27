"use client";

import { useState, useEffect } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  Calendar,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STANDARD_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:30 AM",
  "01:30 PM",
  "03:00 PM",
  "04:30 PM",
  "05:30 PM",
];

export function ScheduleMeetingModal({ isOpen, onClose, onSuccess }: ScheduleMeetingModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [availableSlots, setAvailableSlots] = useState<string[]>(STANDARD_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState(STANDARD_SLOTS[0]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [department, setDepartment] = useState("Engineering");
  const [agenda, setAgenda] = useState("");
  const [objectives, setObjectives] = useState("");
  const [participants, setParticipants] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available slots whenever scheduledDate changes
  useEffect(() => {
    if (!isOpen || !scheduledDate) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/meetings/available-slots?date=${scheduledDate}`);
        if (res.ok) {
          const data = await res.json();
          const slots = data.availableSlots && data.availableSlots.length > 0
            ? data.availableSlots
            : STANDARD_SLOTS;
          setAvailableSlots(slots);
          setSelectedSlot(slots[0]);
        } else {
          setAvailableSlots(STANDARD_SLOTS);
          setSelectedSlot(STANDARD_SLOTS[0]);
        }
      } catch (err) {
        console.warn("Error fetching available slots:", err);
        setAvailableSlots(STANDARD_SLOTS);
        setSelectedSlot(STANDARD_SLOTS[0]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [isOpen, scheduledDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a meeting title.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const slotToUse = selectedSlot || STANDARD_SLOTS[0];

    try {
      const res = await fetch("/api/meetings/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          scheduledDate,
          timeSlot: slotToUse,
          durationMinutes,
          department,
          agenda,
          objectives,
          participants,
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
    <ModalPortal isOpen={isOpen} onClose={onClose} title="Schedule a New Meeting">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl w-full p-6 space-y-5 shadow-2xl text-[var(--text)] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base tracking-wider uppercase text-[var(--text)]">
                SCHEDULE A NEW AI MEETING
              </h2>
              <p className="font-mono text-[11px] text-[var(--text-dim)]">
                Pick date & time slot to schedule AI Notetaker meeting slot.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-[var(--red)]/12 border border-[var(--red)]/40 text-[var(--red)] font-mono text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Meeting Title */}
          <div className="space-y-1">
            <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
              MEETING TITLE <span className="text-[var(--red)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Product Roadmap & Architecture Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Date & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheduled Date */}
            <div className="space-y-1">
              <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
                MEETING DATE <span className="text-[var(--red)]">*</span>
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Duration Selector */}
            <div className="space-y-1">
              <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
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
                        ? "bg-[var(--primary)] text-white border border-[var(--primary)] shadow-sm"
                        : "bg-[var(--panel-alt)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
                    }`}
                  >
                    {dur}M
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Slot Selection */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)]">
            <label className="text-[var(--primary)] font-bold uppercase tracking-wider flex items-center justify-between">
              <span>AVAILABLE TIME SLOTS ({scheduledDate})</span>
              {loadingSlots && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)]" />}
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-3 py-1.5 rounded font-bold transition-all ${
                    selectedSlot === slot
                      ? "bg-[var(--primary)] text-white border border-[var(--primary)] shadow-sm"
                      : "bg-[var(--panel)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)]"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Department & Participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
                DEPARTMENT / TEAM
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Executive">Executive</option>
                <option value="Design">Design</option>
                <option value="Sales">Sales</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
                PARTICIPANT EMAILS
              </label>
              <input
                type="text"
                placeholder="alice@innovexa.com, bob@innovexa.com"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Agenda & Objectives */}
          <div className="space-y-1">
            <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
              AGENDA & MEETING OBJECTIVES (OPTIONAL)
            </label>
            <textarea
              rows={2}
              placeholder="Outline meeting goals, topics, or background context for AI synthesis..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--panel-alt)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] font-mono text-xs font-bold uppercase transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-2 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>SCHEDULE MEETING</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
