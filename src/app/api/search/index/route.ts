import { NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await VectorStoreManager.indexKnowledgeBase();
    return NextResponse.json({
      success: true,
      message: `Successfully indexed ${result.indexedCount} knowledge items into Vector Database`,
      indexedCount: result.indexedCount,
    });
  } catch (error) {
    console.error("[Search Index Error]", error);
    return NextResponse.json(
      { success: false, error: "Failed to reindex knowledge base" },
      { status: 500 }
    );
  }
}
