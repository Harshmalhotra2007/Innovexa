import { NextResponse } from "next/server";
import { checkAndEscalateOverdueTasks } from "@/lib/escalation-engine";

export async function POST() {
  const summary = await checkAndEscalateOverdueTasks();
  return NextResponse.json({ success: true, summary });
}

export async function GET() {
  const summary = await checkAndEscalateOverdueTasks();
  return NextResponse.json({ success: true, summary });
}
