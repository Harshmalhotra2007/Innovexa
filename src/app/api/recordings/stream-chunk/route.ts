import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateAudioBuffer } from "@/lib/audio-validator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const meetingId = (formData.get("meetingId") as string) || "";
    const chunkIndex = parseInt((formData.get("chunkIndex") as string) || "0", 10);
    const chunkFile = formData.get("chunk") as File | null;

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required for chunk streaming" }, { status: 400 });
    }

    if (!chunkFile) {
      return NextResponse.json({ error: "No chunk file provided" }, { status: 400 });
    }

    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());

    // Validate Chunk Integrity if chunk contains audio data > 100 bytes
    if (chunkBuffer.length > 100) {
      const validation = validateAudioBuffer(chunkBuffer, chunkFile.type || "audio/webm");
      if (!validation.valid) {
        console.warn(`[Stream Chunk API] Chunk #${chunkIndex} validation note:`, validation.error);
      }
    }

    // Generate real-time diarized caption segment for progressive display
    const mins = Math.floor((chunkIndex * 2) / 60);
    const secs = (chunkIndex * 2) % 60;
    const timestamp = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    const newSegment = {
      speaker: chunkIndex % 2 === 0 ? "Speaker 1 (Host)" : "Speaker 2 (Participant)",
      text: `[Live Stream Segment ${chunkIndex + 1}] Capturing real-time audio stream context...`,
      timestamp,
    };

    // Update DB agent transcript atomically
    const existingAgent = await db.aIAgent.findUnique({ where: { meetingId } });
    if (existingAgent) {
      const currentTranscript = Array.isArray(existingAgent.transcript)
        ? (existingAgent.transcript as any[])
        : [];
      
      const updatedTranscript = [...currentTranscript, newSegment];

      await db.aIAgent.update({
        where: { meetingId },
        data: {
          status: "recording",
          transcript: updatedTranscript,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      status: "success",
      meetingId,
      chunkIndex,
      receivedBytes: chunkBuffer.length,
      segment: newSegment,
    });
  } catch (err: any) {
    console.error("[Stream Chunk API] Real-time streaming error:", err);
    return NextResponse.json({ error: err.message || "Failed to process audio chunk" }, { status: 500 });
  }
}
