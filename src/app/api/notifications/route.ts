import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Fetch notifications for the current user
 * Query params:
 *   - unreadOnly: "true" to fetch only unread notifications
 *   - limit: max number of notifications (default 50)
 *   - offset: pagination offset (default 0)
 *   - email: user email (for sessionStorage-based auth)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Unauthorized - email required" }, { status: 401 });
    }

    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = {
      recipient: email,
    };

    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { sentAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          taskId: true,
          recipient: true,
          subject: true,
          body: true,
          type: true,
          read: true,
          sentAt: true,
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              deadline: true,
            },
          },
        },
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: { recipient: email, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      unreadCount,
    });
  } catch (error: unknown) {
    console.error("[Notifications API] Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Mark notifications as read for the current user
 * Query params:
 *   - action: "mark-all-read" to mark all as read
 *   - email: user email (for sessionStorage-based auth)
 * Body:
 *   - notificationId: specific notification to mark read (for PATCH)
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const action = searchParams.get("action");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Unauthorized - email required" }, { status: 401 });
    }

    if (action === "mark-all-read") {
      await db.notification.updateMany({
        where: {
          recipient: email,
          read: false,
        },
        data: { read: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Notifications API] Mark all read error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark a specific notification as read
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Unauthorized - email required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 });
    }

    await db.notification.updateMany({
      where: {
        id: notificationId,
        recipient: email,
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Notifications API] Mark read error:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}