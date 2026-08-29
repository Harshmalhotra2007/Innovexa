import { getAIAgentStatus } from "@/lib/ai-agent-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  const { meetingId } = params;

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const agent = await getAIAgentStatus(meetingId);
          const data = JSON.stringify(agent || { status: "idle", meetingId });
          controller.enqueue(`data: ${data}\n\n`);
        } catch (err) {
          console.error("SSE stream error:", err);
        }
      };

      // Send initial update immediately
      await sendUpdate();

      // Interval stream updates every 1.5 seconds for 30 seconds
      let count = 0;
      const interval = setInterval(async () => {
        count++;
        await sendUpdate();
        if (count > 20) {
          clearInterval(interval);
          controller.close();
        }
      }, 1500);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
