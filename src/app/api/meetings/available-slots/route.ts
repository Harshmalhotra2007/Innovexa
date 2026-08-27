import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const targetDate = new Date(dateParam);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Fetch existing meetings scheduled for this date
    const existingMeetings = await db.meeting.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: "Cancelled",
        },
      },
    });

    // Standard business hours slots
    const standardSlots = [
      "09:00 AM",
      "10:00 AM",
      "11:30 AM",
      "01:30 PM",
      "03:00 PM",
      "04:30 PM",
      "05:30 PM",
    ];

    // Filter out slots that conflict with existing meeting hours
    const availableSlots = standardSlots.filter((slot) => {
      const [timeStr, period] = slot.split(" ");
      let [hours, mins] = timeStr.split(":").map((n) => parseInt(n, 10));
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      const slotTime = new Date(startOfDay);
      slotTime.setHours(hours, mins, 0, 0);

      // Check if any existing meeting occupies this slotTime
      const isOccupied = existingMeetings.some((m) => {
        const mTime = new Date(m.scheduledDate || m.date).getTime();
        const durationMs = (m.durationMinutes || m.durationMins || 30) * 60 * 1000;
        return slotTime.getTime() >= mTime && slotTime.getTime() < mTime + durationMs;
      });

      return !isOccupied;
    });

    return NextResponse.json({
      date: dateParam,
      availableSlots,
      totalAvailable: availableSlots.length,
    });
  } catch (err: any) {
    console.error("[Available Slots API Error]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch available slots" }, { status: 500 });
  }
}
