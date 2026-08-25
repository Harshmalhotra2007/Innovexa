"use client";

import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#0D1315] text-[#e8e1d5] font-sans antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#212B2E] bg-[#141C1F]/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 font-mono text-xs text-[#9a99a0]">
            <span className="text-[#E8A33D] font-bold">PREVIEW ENVIRONMENT</span>
            <span>/</span>
            <span className="text-[#e8e1d5]">Innovexa Ops Console</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-[#49B9AE]/15 text-[#49B9AE] border border-[#49B9AE]/30">
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
