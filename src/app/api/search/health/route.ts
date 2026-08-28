import { NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await VectorStoreManager.getHealth();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: "STANDALONE_HYBRID",
        provider: "Hybrid-Local",
        collections: ["meeting_transcripts", "meeting_decisions"],
        totalIndexedItems: 0,
        embeddingDimensions: 384,
        endpoint: "in-process://vector-hybrid",
      },
      { status: 200 }
    );
  }
}
