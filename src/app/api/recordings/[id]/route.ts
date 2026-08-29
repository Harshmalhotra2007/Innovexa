import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Robust Recording Audio Delivery Endpoint with CORS & Audio Header Stream
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { id } = params;
    const scratchDir = path.join(process.cwd(), "scratch");
    
    // Check possible local recording extensions
    const extensions = [".wav", ".mp3", ".flac", ".mp4", ".m4a"];
    let filePath: string | null = null;
    let foundExt = ".wav";

    for (const ext of extensions) {
      const candidate = path.join(scratchDir, `${id}${ext}`);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        foundExt = ext;
        break;
      }
    }

    if (!filePath) {
      // Fallback check in root scratch
      const defaultFile = path.join(scratchDir, "failsafe_test.wav");
      if (fs.existsSync(defaultFile)) {
        filePath = defaultFile;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Audio recording file not found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          },
        }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeTypes: Record<string, string> = {
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".flac": "audio/flac",
      ".mp4": "video/mp4",
      ".m4a": "audio/mp4",
    };

    const contentType = mimeTypes[foundExt] || "audio/wav";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Expose-Headers": "Content-Length, Content-Type",
      },
    });
  } catch (error: any) {
    console.error("[Recordings API] Error serving recording:", error);
    return NextResponse.json(
      { error: "Failed to stream recording file" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
