import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, TaskStatus, TaskPriority } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const status = searchParams.get("status");

  const where: Prisma.TaskWhereInput = {};
  if (department && department !== "All") {
    where.department = department;
  }
  if (status && status !== "All") {
    where.status = status as TaskStatus;
  }

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
    include: {
      meeting: {
        select: { id: true, title: true, date: true },
      },
      notifications: true,
    },
  });

  return NextResponse.json(tasks);
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

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
