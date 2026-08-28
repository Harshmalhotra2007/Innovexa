import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = await db.notification.findMany({
      orderBy: { sentAt: "desc" },
      take: 20,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            department: true,
            ownerName: true,
            status: true,
            deadline: true,
          },
        },
      },
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    const events = notifications.map((n) => ({
      id: n.id,
      taskId: n.taskId,
      recipient: n.recipient,
      subject: n.subject,
      body: n.body,
      type: n.type,
      read: n.read,
      sentAt: n.sentAt,
      task: n.task,
    }));

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: events,
    });
  } catch (error: unknown) {
    console.error("[Notifications API GET Error]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await db.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      await db.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return NextResponse.json({ success: true, message: `Notification '${notificationId}' marked as read.` });
    }

    return NextResponse.json({ error: "notificationId or markAllRead parameter required" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Notifications API PATCH Error]", error);
    const message = error instanceof Error ? error.message : "Failed to update notification state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
