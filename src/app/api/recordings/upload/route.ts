import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadToStorage } from "@/lib/storage";
import { revalidateTag } from "next/cache";
import { validateAudioBuffer } from "@/lib/audio-validator";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/webm;codecs=opus",
];

export async function POST(req: Request) {
  try {
    // 1. Role / Session Check
    const userRole = req.headers.get("x-user-role");
    if (userRole && userRole !== "organizer" && userRole !== "attendee" && userRole !== "system") {
      return NextResponse.json({ error: "Forbidden: Requester must be an organizer or participant" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let meetingId = "";
    let audioBuffer: Buffer;
    let mimeType = "audio/mp3";
    let fileName = "recording.mp3";
    let duration = 0;

    // 2. Parse Request Body
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      meetingId = (formData.get("meetingId") as string) || "";
      duration = parseInt((formData.get("duration") as string) || "0", 10);
      
      const file = formData.get("audio") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No audio file provided in form data" }, { status: 400 });
      }

      // Validation
      if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("audio/")) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 });
      }

      mimeType = file.type || "audio/mp3";
      fileName = file.name || "recording.mp3";
      audioBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Handle JSON body (curl/test requests)
      const body = await req.json();
      meetingId = body.meetingId || "";
      duration = body.duration || 0;
      mimeType = body.format || "audio/mp3";

      if (!body.audioBlob) {
        return NextResponse.json({ error: "No audioBlob data provided" }, { status: 400 });
      }

      // Convert base64 audioBlob to buffer
      try {
        audioBuffer = Buffer.from(body.audioBlob, "base64");
      } catch (err) {
        return NextResponse.json({ error: "Invalid base64 encoding for audioBlob" }, { status: 400 });
      }

      if (audioBuffer.length > MAX_SIZE) {
        return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 });
      }

      if (!ALLOWED_TYPES.includes(mimeType) && !mimeType.startsWith("audio/")) {
        return NextResponse.json({ error: `Invalid file type: ${mimeType}` }, { status: 400 });
      }

      const ext = mimeType.split("/")[1] || "mp3";
      fileName = `recording.${ext}`;
    }

    // Audio Buffer Usability & Quality Validation
    const audioValidation = validateAudioBuffer(audioBuffer, mimeType);
    if (!audioValidation.valid) {
      console.warn("[Upload API] Audio validation rejected payload:", audioValidation.error);
      return NextResponse.json(
        { error: `Audio validation failed: ${audioValidation.error}` },
        { status: 400 }
      );
    }

    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
    }

    // 3. Verify Meeting Exists
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // 4. Upload to Storage
    const storageUrl = await uploadToStorage(audioBuffer, meetingId, fileName, mimeType);

    // 5. Create Recording Metadata in DB
    const recording = await db.recording.create({
      data: {
        meetingId,
        url: storageUrl,
        duration: duration || 30, // fallback to 30s if not set
        size: audioBuffer.length,
        format: mimeType,
      },
    });

    revalidateTag("meetings");

    return NextResponse.json(recording, { status: 201 });
  } catch (error: any) {
    console.error("Recording upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
