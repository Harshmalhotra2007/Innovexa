import { db } from "./src/lib/db.ts";

const DEFAULT_MEETINGBAAS_KEY = "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk";

function extractMeetCode(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

async function testDelete(id: string) {
  try {
    // Fetch meeting first so we have the meetingUrl (stored in agenda field)
    let meeting: any = null;
    try {
      meeting = await db.meeting.findUnique({
        where: { id },
        select: { id: true, agenda: true },
      });
    } catch (e) {
      meeting = null;
    }

    console.log("Found meeting:", meeting);

    const botServiceUrl = process.env.BOT_SERVICE_URL || process.env.MEET_BOT_URL || "https://innovexa-meet-bot.onrender.com";
    const meetingUrl = meeting?.agenda?.includes("meet.google.com") ? meeting.agenda : null;
    const meetCode = extractMeetCode(meetingUrl);
    const baasApiKey = process.env.MEETINGBAAS_API_KEY || DEFAULT_MEETINGBAAS_KEY;

    // Delete associated records & meeting record
    await db.task.deleteMany({ where: { meetingId: id } });
    await db.decision.deleteMany({ where: { meetingId: id } });
    await db.actionItem.deleteMany({ where: { meetingId: id } });
    if (db.aIAgent && typeof (db.aIAgent as any).deleteMany === "function") {
      await (db.aIAgent as any).deleteMany({ where: { meetingId: id } }).catch(() => {});
    }

    // Now delete the meeting record
    await db.meeting.delete({ where: { id } });

    console.log("Deleted meeting successfully");
  } catch (error: any) {
    console.error("Failed to delete meeting:", error);
  }
}

// Run test on the remaining meeting
testDelete("16347a6c-9074-4399-8a88-fb3f7acc52d6").then(() => db.$disconnect());
