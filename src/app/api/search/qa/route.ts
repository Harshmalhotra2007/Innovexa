import { NextResponse } from "next/server";
import { VectorStoreManager } from "@/lib/vector-store";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question parameter is required" }, { status: 400 });
    }

    // 1. Retrieve top vector embeddings context
    const matches = await VectorStoreManager.queryKnowledgeBase(question, { limit: 4 });
    const contextBlocks = matches
      .map((m, idx) => `[Citation ${idx + 1}] (${m.title}): ${m.content}`)
      .join("\n\n");

    let answer = "";
    const citations = matches.map((m, idx) => ({
      citationId: idx + 1,
      title: m.title,
      type: m.type,
      meetingId: m.meetingId,
      score: (m.score * 100).toFixed(0) + "%",
    }));

    // 2. Query LLM if OpenAI/Groq configured
    if (config.hasGroq && config.groqApiKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.groqApiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content:
                  "You are the Innovexa Knowledge Oracle. Answer the user question accurately using only the provided meeting knowledge citations. Ground all statements with citation numbers like [Citation 1].",
              },
              {
                role: "user",
                content: `Context:\n${contextBlocks}\n\nQuestion: ${question}`,
              },
            ],
            temperature: 0.2,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          answer = groqData.choices?.[0]?.message?.content || "";
        }
      } catch (llmErr) {
        console.warn("[Search QA LLM Note]", llmErr);
      }
    }

    // Fallback grounded answer synthesis if LLM is offline
    if (!answer) {
      if (matches.length > 0) {
        const top = matches[0];
        answer = `Based on the latest meeting records regarding "${top.title}", ${top.content} [Citation 1].`;
      } else {
        answer = "No matching records found in the semantic vector database for this inquiry.";
      }
    }

    return NextResponse.json({
      answer,
      citations,
      contextCount: matches.length,
    });
  } catch (error) {
    console.error("[Search QA Error]", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
