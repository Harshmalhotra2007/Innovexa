import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processMeetingTranscript, ExtractedActionItem } from "@/lib/ai-engine";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { apiHandler, ApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (req) => {
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
      throw new ApiError(404, "Meeting not found");
    }

    if (!meeting.transcript) {
      throw new ApiError(400, "Meeting transcript not available");
    }

    // 2. Extract action items from transcript
    const extractionResult = await processMeetingTranscript(
      meeting.transcript,
      meeting.department || "Engineering"
    );

    const { actionItems } = extractionResult;

    if (!actionItems || actionItems.length === 0) {
      return {
        message: "No action items found in transcript",
        tasks: [],
      };
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

    return {
      message: `Successfully extracted and created ${createdTasks.length} task(s)`,
      tasks: createdTasks,
    };
  });
}