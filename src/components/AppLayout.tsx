"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { HostMeetingModal } from "./HostMeetingModal";
import { Radio } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar onHostClick={() => setIsHostModalOpen(true)} />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-dim)]">
            <span className="text-[var(--primary)] font-bold">ENTERPRISE CONSOLE</span>
            <span>/</span>
            <span className="text-[var(--text)] font-semibold">Innovexa Ops</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHostModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[var(--primary-hover)] transition-all shadow-sm flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>HOST MEETING</span>
            </button>

            <span className="px-2.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-[var(--teal)]/12 text-[var(--teal)] border border-[var(--teal)]/30 hidden sm:inline-block">
              STAGING PREVIEW
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Host Meeting Modal */}
      <HostMeetingModal
        isOpen={isHostModalOpen}
        onClose={() => setIsHostModalOpen(false)}
      />
    </div>
  );
}
