import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { config } from "./config";

// Initialize S3 Client if credentials exist
const s3Bucket = config.s3Bucket;
const s3Region = config.s3Region;
const s3Client = s3Bucket && config.awsAccessKeyId && config.awsSecretAccessKey
  ? new S3Client({
      region: s3Region,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    })
  : null;

// Initialize Supabase Client if credentials exist
const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Uploads a buffer to AWS S3, Supabase, or falls back to local disk storage
 */
export async function uploadToStorage(
  fileBuffer: Buffer,
  meetingId: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const extension = fileName.split(".").pop() || "mp3";
  const uniqueKey = `recordings/${meetingId}/${Date.now()}.${extension}`;

  // 1. AWS S3 Upload
  if (s3Client && s3Bucket) {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: s3Bucket,
          Key: uniqueKey,
          Body: fileBuffer,
          ContentType: mimeType,
        },
      });
      await upload.done();
      return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${uniqueKey}`;
    } catch (err) {
      console.error("AWS S3 Upload failed, falling back:", err);
    }
  }

  // 2. Supabase Storage Upload
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from("recordings")
        .upload(uniqueKey, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (error) throw error;
      return `${supabaseUrl}/storage/v1/object/public/recordings/${uniqueKey}`;
    } catch (err) {
      console.error("Supabase Storage Upload failed, falling back:", err);
    }
  }

  // 3. Local Disk Storage Fallback
  try {
    const publicDir = path.join(process.cwd(), "public");
    const recordingsDir = path.join(publicDir, "recordings", meetingId);

    // Create directories if they don't exist
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const localFileName = `${Date.now()}.${extension}`;
    const filePath = path.join(recordingsDir, localFileName);
    fs.writeFileSync(filePath, fileBuffer);

    // Return the relative URL served by Next.js static files
    return `/recordings/${meetingId}/${localFileName}`;
  } catch (err) {
    console.error("Local file writing failed:", err);
    throw new Error("Failed to save audio recording to any storage provider.");
  }
}
