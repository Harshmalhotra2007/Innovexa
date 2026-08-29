import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSLAEscalationEmail } from "@/lib/email-engine";
import { apiHandler, ApiError } from "@/lib/api-handler";

export async function POST(req: Request) {
  return apiHandler(req, async (req) => {
    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      throw new ApiError(400, "Task ID is required");
    }

    // 1. Fetch task details
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        meeting: { select: { title: true } },
      },
    });

    if (!task) {
      throw new ApiError(404, `Task with ID ${taskId} not found`);
    }

    // Determine if warning or escalation
    const isEscated = task.status === "Escalated" || task.escalationLevel >= 2;
    const type = isEscated ? "Escalation" : "Warning";

    // 2. Fetch department manager map
    const departments = await db.department.findMany();
    const deptManagerMap = new Map<string, string>();
    departments.forEach((d) => {
      deptManagerMap.set(d.name, `${d.managerName} (${d.code} Dept Head)`);
    });

    // 3. Resolve recipient email and name
    let recipientEmail = "";
    let recipientName = "";

    if (isEscated) {
      recipientName = deptManagerMap.get(task.department) || "Department Lead";
      recipientEmail = `manager.${task.department.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`;
    } else {
      recipientName = task.ownerName;
      recipientEmail = task.ownerEmail || `${task.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@innovexa.com`;
    }

    const hoursOverdue = Math.max(
      0.1,
      (Date.now() - new Date(task.deadline).getTime()) / (1000 * 60 * 60)
    );

    // 4. Send the SLA escalation or warning email
    const emailResult = await sendSLAEscalationEmail({
      taskId: task.id,
      taskTitle: task.title,
      ownerName: task.ownerName,
      ownerEmail: task.ownerEmail || undefined,
      recipientEmail,
      recipientName,
      department: task.department,
      priority: task.priority,
      type,
      hoursOverdue,
      deadline: task.deadline,
    });

    return {
      success: true,
      type,
      recipient: recipientEmail,
      recipientName,
      emailResult,
    };
  });
}
