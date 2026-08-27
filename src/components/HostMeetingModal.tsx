"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  Radio,
  Video,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  Building2,
  FileText,
} from "lucide-react";

interface HostMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HostMeetingModal({ isOpen, onClose }: HostMeetingModalProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [googleMeetLink, setGoogleMeetLink] = useState("");
  const [agenda, setAgenda] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHostMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/meetings/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          department,
          googleMeetLink: googleMeetLink.trim() || undefined,
          agenda: agenda.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to host instant meeting");
      }

      const data = await res.json();
      onClose();
      // Redirect directly to the live meeting room
      router.push(`/meetings/${data.meetingId}`);
    } catch (err: any) {
      setError(err.message || "Failed to host instant meeting.");
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} title="Host Instant AI Meeting">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl w-full p-6 space-y-5 shadow-2xl text-[var(--text)] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] animate-pulse">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base tracking-wider uppercase text-[var(--text)]">
                HOST INSTANT AI MEETING
              </h2>
              <p className="font-mono text-[11px] text-[var(--text-dim)]">
                Starts meeting immediately & dispatches AI Notetaker bot.
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
          <div className="p-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/40 text-[var(--red)] font-mono text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleHostMeeting} className="space-y-4 font-mono text-xs">
          {/* Meeting Title */}
          <div className="space-y-1">
            <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
              MEETING TITLE (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. Instant Architecture & Sprint Sync (Defaults to timestamp)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Department Selection */}
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

          {/* Google Meet Link */}
          <div className="space-y-1">
            <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
              GOOGLE MEET URL (OPTIONAL)
            </label>
            <input
              type="url"
              placeholder="e.g. https://meet.google.com/qfz-imot-oic"
              value={googleMeetLink}
              onChange={(e) => setGoogleMeetLink(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Agenda */}
          <div className="space-y-1">
            <label className="text-[var(--text-dim)] font-bold uppercase tracking-wider block">
              AGENDA / NOTES (OPTIONAL)
            </label>
            <textarea
              rows={2}
              placeholder="Outline meeting goals or context..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[var(--panel-alt)] border border-[var(--border)] text-xs font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--border)]">
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
              className="px-6 py-2.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              <span>START & LAUNCH AI BOT</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
