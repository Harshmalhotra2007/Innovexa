import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { startTaskSLAMonitorWorker } from "@/lib/task-sla-monitor";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Innovexa Ops Console | Intelligent Meeting, Decision & Action System",
  description: "Organizational memory and action tracking platform converting audio & transcripts into structured decisions, task SLA tracking, and semantic knowledge base.",
};

// Start the task SLA monitoring worker on server startup
if (typeof window === "undefined") {
  // Use a more reliable singleton pattern for server-only initialization
  // @ts-ignore: global variable
  if (!global.__taskSLAWorkerStarted) {
    // @ts-ignore: global variable
    global.__taskSLAWorkerStarted = true;
    try {
      startTaskSLAMonitorWorker();
      console.log("[App Layout] Task SLA monitoring worker started on server");
    } catch (error) {
      console.error("[App Layout] Failed to start task SLA monitoring worker:", error);
      // Don't throw here to prevent breaking the app initialization
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased selection:bg-[var(--primary)] selection:text-white`}>
        <AuthGuard>
          <AppLayout>{children}</AppLayout>
        </AuthGuard>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

