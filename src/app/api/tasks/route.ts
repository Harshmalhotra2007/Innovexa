import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, TaskStatus, TaskPriority } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";

const getCachedTasks = (
  department: string | null,
  status: string | null,
  cursor: string | null,
  limit: number
) => {
  return unstable_cache(
    async () => {
      const where: Prisma.TaskWhereInput = {};
      if (department && department !== "All") {
        where.department = department;
      }
      if (status && status !== "All") {
        where.status = status as TaskStatus;
      }

      const queryOptions: Prisma.TaskFindManyArgs = {
        where,
        orderBy: [{ status: "asc" }, { deadline: "asc" }],
        include: {
          meeting: {
            select: { id: true, title: true, date: true },
          },
          notifications: true,
        },
      };

      if (limit > 0) {
        queryOptions.take = limit;
      }
      if (cursor) {
        queryOptions.skip = 1;
        queryOptions.cursor = { id: cursor };
      }

      return db.task.findMany(queryOptions);
    },
    [`tasks-list-${department || "All"}-${status || "All"}-${cursor || "none"}-${limit}`],
    { revalidate: 3600, tags: ["tasks"] }
  )();
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const cursor = searchParams.get("cursor");
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 0;

    const tasks = await getCachedTasks(department, status, cursor, limit);
    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { taskId, status, priority, deadline, escalationLevel } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status as TaskStatus;
    if (priority) updateData.priority = priority as TaskPriority;
    if (deadline) updateData.deadline = new Date(deadline);
    if (typeof escalationLevel === "number") updateData.escalationLevel = escalationLevel;

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    revalidateTag("tasks");

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
