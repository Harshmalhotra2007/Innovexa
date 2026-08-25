import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");

    const where: any = {};
    if (department && department !== "All") {
      where.department = department;
    }

    const decisions = await db.decision.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        meeting: {
          select: { id: true, title: true, date: true },
        },
      },
    });

    return NextResponse.json(decisions);
  } catch (error: any) {
    console.error("[Decisions API] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch decisions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, context, rationale, department, tags, meetingId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Decision title is required" }, { status: 400 });
    }

    // If meetingId is provided, verify or use default
    let validMeetingId = meetingId;
    if (!validMeetingId) {
      const firstMeeting = await db.meeting.findFirst({ select: { id: true } });
      validMeetingId = firstMeeting?.id || null;
    }

    if (!validMeetingId) {
      // Create fallback dummy meeting if none exists
      const dummyMeeting = await db.meeting.create({
        data: {
          title: "Executive Governance Session",
          date: new Date(),
          durationMins: 30,
          department: department || "Operations",
        },
      });
      validMeetingId = dummyMeeting.id;
    }

    const newDecision = await db.decision.create({
      data: {
        title: title.trim(),
        context: context || "Recorded formal organizational decision.",
        rationale: rationale || null,
        department: department || "Operations",
        tags: Array.isArray(tags) ? tags : [],
        meetingId: validMeetingId,
      },
    });

    return NextResponse.json({ success: true, decision: newDecision }, { status: 201 });
  } catch (error: any) {
    console.error("[Decisions API] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create decision" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const decisionId = searchParams.get("decisionId");

    if (!decisionId) {
      return NextResponse.json({ error: "Decision ID is required" }, { status: 400 });
    }

    await db.decision.delete({
      where: { id: decisionId },
    });

    return NextResponse.json({ success: true, message: "Decision deleted successfully" });
  } catch (error: any) {
    console.error("[Decisions API] DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete decision" }, { status: 500 });
  }
}
