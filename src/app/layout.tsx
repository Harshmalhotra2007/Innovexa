import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "MeetIQ Ops Console | Intelligent Meeting, Decision & Action System",
  description: "Organizational memory and action tracking platform converting audio & transcripts into structured decisions, task SLA tracking, and semantic knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0D1315] text-[#E7EEEF] antialiased selection:bg-[#E8A33D] selection:text-[#1A1305]">
        <AuthGuard>
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </AuthGuard>
      </body>
    </html>
  );
}
