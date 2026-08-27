import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processMeetingTranscript, ExtractedActionItem } from "@/lib/ai-engine";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: meetingId } = params;

    // 1. Get the meeting
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        title: true,
        transcript: true,
        department: true,
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    if (!meeting.transcript) {
      return NextResponse.json(
        { error: "Meeting transcript not available" },
        { status: 400 }
      );
    }

    // 2. Extract action items from transcript
    const extractionResult = await processMeetingTranscript(
      meeting.transcript,
      meeting.department || "Engineering"
    );

    const { actionItems } = extractionResult;

    if (!actionItems || actionItems.length === 0) {
      return NextResponse.json(
        { message: "No action items found in transcript", tasks: [] },
        { status: 200 }
      );
    }

    // 3. Create tasks for each action item
    const createdTasks = [];

    for (const actionItem of actionItems) {
      // Map priority from ai-engine to Prisma TaskPriority
      const priorityMap: Record<string, TaskPriority> = {
        High: "High",
        Medium: "Medium",
        Low: "Low",
      };
      const prismaPriority = priorityMap[actionItem.priority] || "Medium";

      // Calculate deadline from deadlineDaysFromNow
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + actionItem.deadlineDaysFromNow);

      // Create task
      const task = await db.task.create({
        data: {
          title: actionItem.title,
          description: actionItem.description,
          ownerName: actionItem.ownerName,
          ownerEmail: actionItem.ownerEmail,
          department: actionItem.department || meeting.department || "Operations",
          priority: prismaPriority,
          status: "Pending",
          deadline,
          meetingId: meeting.id,
          // assigneeId will be set later via assignment or left null for now
          assigneeId: null,
        },
      });

      createdTasks.push(task);
    }

    // 4. Revalidate tasks tag
    // Note: We don't have a direct way to revalidate by meetingId, but we can revalidate the tasks list tag
    // In a real app, we might have a more specific tag, but for now we'll use the existing one.
    // We'll skip revalidation for simplicity in this example, but in production we would do:
    // revalidateTag("tasks");

    return NextResponse.json(
      {
        message: `Successfully extracted and created ${createdTasks.length} task(s)`,
        tasks: createdTasks,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Extract Action Items Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract action items" },
      { status: 500 }
    );
  }
}