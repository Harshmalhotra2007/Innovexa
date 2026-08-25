"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Radio, Server, CheckCircle2, UserCheck } from "lucide-react";

export default function SettingsPage() {
  const [userRole, setUserRole] = useState("organizer");
  const [defaultQuality, setDefaultQuality] = useState("medium");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem("userRole") || "organizer";
    setUserRole(role);
  }, []);

  const handleSave = () => {
    sessionStorage.setItem("userRole", userRole);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans text-[#e8e1d5] max-w-4xl">
      {/* Header */}
      <div className="border-b border-[#212B2E] pb-6">
        <h1 className="text-2xl font-display font-bold text-[#e8e1d5] tracking-wide uppercase flex items-center gap-3">
          <Settings className="w-6 h-6 text-[#E8A33D]" /> SYSTEM CONFIGURATION & PREFERENCES
        </h1>
        <p className="text-xs font-mono text-[#9a99a0] mt-1">
          Tune meeting bot defaults, user role views, and webhook integration preferences.
        </p>
      </div>

      {/* Role Preference Card */}
      <div className="rounded-xl border border-[#212B2E] bg-[#182124] p-5 shadow-2xl space-y-4 font-mono text-xs">
        <div className="font-bold text-[#49B9AE] uppercase tracking-wider flex items-center gap-2 border-b border-[#212B2E] pb-3">
          <UserCheck className="w-4 h-4" /> USER ROLE VIEW PREFERENCE
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setUserRole("organizer")}
            className={`p-4 rounded-lg border text-left space-y-1 transition-all ${
              userRole === "organizer"
                ? "bg-[#E8A33D]/10 border-[#E8A33D] text-white"
                : "bg-[#141C1F] border-[#2B383C] text-[#9a99a0]"
            }`}
          >
            <div className="font-bold text-[#E8A33D]">ORGANIZER (Full Control)</div>
            <div className="text-[11px]">Can launch bots, end meetings, and manage action deliverables.</div>
          </button>

          <button
            onClick={() => setUserRole("participant")}
            className={`p-4 rounded-lg border text-left space-y-1 transition-all ${
              userRole === "participant"
                ? "bg-[#49B9AE]/10 border-[#49B9AE] text-white"
                : "bg-[#141C1F] border-[#2B383C] text-[#9a99a0]"
            }`}
          >
            <div className="font-bold text-[#49B9AE]">PARTICIPANT (Read-Only)</div>
            <div className="text-[11px]">Clean read-only access to transcripts, summaries, and tasks.</div>
          </button>
        </div>
      </div>

      {/* Default Audio Quality Profile */}
      <div className="rounded-xl border border-[#212B2E] bg-[#182124] p-5 shadow-2xl space-y-4 font-mono text-xs">
        <div className="font-bold text-[#E8A33D] uppercase tracking-wider flex items-center gap-2 border-b border-[#212B2E] pb-3">
          <Radio className="w-4 h-4" /> DEFAULT AUDIO RECORDING QUALITY PROFILE
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["high", "medium", "low"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setDefaultQuality(q)}
              className={`p-3 rounded-lg border text-center font-bold uppercase transition-all ${
                defaultQuality === q
                  ? "bg-[#49B9AE] text-[#0D1A18] border-[#49B9AE]"
                  : "bg-[#141C1F] text-[#9a99a0] border-[#2B383C]"
              }`}
            >
              {q === "high" ? "High (128k)" : q === "medium" ? "Medium (64k)" : "Low (32k)"}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-lg bg-[#49B9AE] text-[#0D1A18] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#3ca298] transition-all shadow-lg shadow-[#49B9AE]/20"
        >
          SAVE CONFIGURATION
        </button>
        {saved && (
          <span className="text-xs font-mono text-[#49B9AE] flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Configuration saved cleanly!
          </span>
        )}
      </div>
    </div>
  );
}
