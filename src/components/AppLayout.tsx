"use client";

import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-raised)]/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-dim)]">
            <span className="text-[var(--primary)] font-bold">PREVIEW ENVIRONMENT</span>
            <span>/</span>
            <span className="text-[var(--text)]">Innovexa Ops Console</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30">
              STAGING PREVIEW
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
