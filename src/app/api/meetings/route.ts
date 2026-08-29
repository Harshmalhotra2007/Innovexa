import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processMeetingTranscript } from "@/lib/ai-engine";
import { unstable_cache, revalidateTag } from "next/cache";
import { triggerOracleCoreIndexing } from "@/lib/oracle-core-client";
import { TaskStatus, TaskPriority } from "@prisma/client";

const getCachedMeetings = unstable_cache(
  async () => {
    return db.meeting.findMany({
      orderBy: { date: "desc" },
      include: {
        decisions: true,
        tasks: true,
        segments: { select: { id: true, speaker: true, timestamp: true, text: true, type: true, order: true } },
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

    // 3. Batch Create Action Items / Tasks in a single DB query
    if (aiResult.actionItems && aiResult.actionItems.length > 0) {
      const taskData = aiResult.actionItems.map((item) => ({
        meetingId: newMeeting.id,
        title: item.title,
        description: item.description,
        ownerName: item.ownerName,
        ownerEmail: item.ownerEmail,
        department: item.department || department || "Engineering",
        priority: (item.priority as TaskPriority) || TaskPriority.Medium,
        status: TaskStatus.Pending,
        deadline: new Date(Date.now() + (item.deadlineDaysFromNow || 3) * 86400000),
        escalationLevel: 0,
      }));

      await db.task.createMany({
        data: taskData,
      });
    }

    revalidateTag("meetings", "max");
    revalidateTag("tasks", "max");

    // 4. Trigger Operation "Oracle Core" background indexing
    await triggerOracleCoreIndexing(newMeeting.id, transcript);

    return NextResponse.json({ success: true, meetingId: newMeeting.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process meeting";
    console.error("Error creating meeting:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
