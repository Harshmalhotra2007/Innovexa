import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "organizer") {
      return NextResponse.json({ error: "Forbidden: Requester must be an organizer" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { assigneeId } = body;

    const updateData: any = {
      assigneeId: assigneeId || null,
    };

    if (assigneeId) {
      const user = await db.user.findUnique({ where: { id: assigneeId } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      updateData.ownerName = user.name;
      updateData.ownerEmail = user.email;
    } else {
      updateData.ownerName = "Unassigned";
      updateData.ownerEmail = null;
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to assign task" }, { status: 500 });
  }
}
