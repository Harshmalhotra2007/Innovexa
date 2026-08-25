import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} min-h-screen bg-[#0D1315] text-[#E7EEEF] antialiased selection:bg-[#E8A33D] selection:text-[#1A1305]`}>
        <AuthGuard>
          <AppLayout>{children}</AppLayout>
        </AuthGuard>
        <SpeedInsights />
      </body>
    </html>
  );
}

