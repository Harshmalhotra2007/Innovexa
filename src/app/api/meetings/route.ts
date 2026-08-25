import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processMeetingTranscript } from "@/lib/ai-engine";
import { unstable_cache, revalidateTag } from "next/cache";
import { triggerOracleCoreIndexing } from "@/lib/oracle-core-client";

const getCachedMeetings = unstable_cache(
  async () => {
    return db.meeting.findMany({
      orderBy: { date: "desc" },
      include: {
        segments: { orderBy: { order: "asc" } },
        decisions: true,
        tasks: true,
      },
    });
  },
  ["meetings-list"],
  { revalidate: 3600, tags: ["meetings"] }
);

export async function GET() {
  const meetings = await getCachedMeetings();
  return NextResponse.json(meetings);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, department, agenda, objectives, transcript, apiKey } = body;

    if (!title || !transcript) {
      return NextResponse.json({ error: "Title and transcript are required." }, { status: 400 });
    }

    // 1. Process transcript using AI engine
    const aiResult = await processMeetingTranscript(transcript, department || "Engineering", apiKey);

    // 2. Save meeting in DB
    const newMeeting = await db.meeting.create({
      data: {
        title,
        date: new Date(),
        durationMins: Math.max(15, Math.ceil(aiResult.segments.length * 3)),
        department: department || "Engineering",
        agenda: agenda || "General Alignment & Task Distribution",
        objectives: objectives || aiResult.keyObjectives.join("; "),
        transcript,
        status: "Processed",
        segments: {
          create: aiResult.segments.map((seg) => ({
            speaker: seg.speaker,
            timestamp: seg.timestamp,
            text: seg.text,
            type: seg.type,
            order: seg.order,
          })),
        },
        decisions: {
          create: aiResult.decisions.map((dec) => ({
            title: dec.title,
            context: dec.context,
            rationale: dec.rationale,
            department: dec.department || department || "Engineering",
            tags: Array.isArray(dec.tags) ? dec.tags : [],
          })),
        },
      },
    });

    // 3. Create Action Items / Tasks
    for (const item of aiResult.actionItems) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (item.deadlineDaysFromNow || 3));

      await db.task.create({
        data: {
          meetingId: newMeeting.id,
          title: item.title,
          description: item.description,
          ownerName: item.ownerName,
          ownerEmail: item.ownerEmail,
          department: item.department || department || "Engineering",
          priority: item.priority || "Medium",
          status: "Pending",
          deadline,
          escalationLevel: 0,
        },
      });
    }
    revalidateTag("meetings");
    revalidateTag("tasks");

    // 4. Trigger Operation "Oracle Core" background indexing
    await triggerOracleCoreIndexing(newMeeting.id, transcript);

    return NextResponse.json({ success: true, meetingId: newMeeting.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process meeting";
    console.error("Error creating meeting:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
