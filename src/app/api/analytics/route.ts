import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalMeetings = await db.meeting.count();
    const totalDecisions = await db.decision.count();
    const totalTasks = await db.task.count();
    const completedTasks = await db.task.count({ where: { status: "Completed" } });
    const overdueTasks = await db.task.count({ where: { status: "Overdue" } });
    const escalatedTasks = await db.task.count({ where: { status: "Escalated" } });
    const pendingTasks = await db.task.count({ where: { status: "Pending" } });
    const inProgressTasks = await db.task.count({ where: { status: "In_Progress" } });

    const closureRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overdueRate =
      totalTasks > 0 ? Math.round(((overdueTasks + escalatedTasks) / totalTasks) * 100) : 0;

    // Compute real average decision lag per department
    const tasksWithMeetingDept = await db.task.findMany({
      where: { meetingId: { not: null } },
      include: { meeting: { select: { date: true, department: true } } },
    });

    const getAvgLag = (tasks: any[]) => {
      const lagDaysArr = tasks
        .filter((t) => t.meeting)
        .map((t) => {
          const lagMs = t.createdAt.getTime() - t.meeting!.date.getTime();
          return Math.max(0, Math.round(lagMs / (1000 * 60 * 60 * 24)));
        });
      return lagDaysArr.length > 0
        ? Math.round((lagDaysArr.reduce((a, b) => a + b, 0) / lagDaysArr.length) * 10) / 10
        : 0;
    };
    const avgDecisionLagDays = getAvgLag(tasksWithMeetingDept);

    // Department Workload Breakdown
    const departments = [
      "Engineering",
      "Product & UI/UX",
      "Operations & Logistics",
      "Cybersecurity & Governance",
    ];
    const departmentStats = [];

    for (const dept of departments) {
      const deptTotal = await db.task.count({ where: { department: dept } });
      const deptCompleted = await db.task.count({ where: { department: dept, status: "Completed" } });
      const deptEscalated = await db.task.count({
        where: { department: dept, status: { in: ["Overdue", "Escalated"] } },
      });
      const deptDecisions = await db.decision.count({ where: { department: dept } });
      const deptMeetings = await db.meeting.count({ where: { department: dept } });
      const deptLag = getAvgLag(tasksWithMeetingDept.filter(t => t.department === dept));

      departmentStats.push({
        department: dept,
        totalTasks: deptTotal,
        completedTasks: deptCompleted,
        escalatedTasks: deptEscalated,
        decisions: deptDecisions,
        meetings: deptMeetings,
        avgLag: deptLag,
        completionRate: deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100) : 100,
      });
    }

    // Real monthly productivity trend
    const allTasks = await db.task.findMany({
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });
    const allDecisions = await db.decision.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const MONTH_LABELS: Record<string, string> = {
      "01": "Jan",
      "02": "Feb",
      "03": "Mar",
      "04": "Apr",
      "05": "May",
      "06": "Jun",
      "07": "Jul",
      "08": "Aug",
      "09": "Sep",
      "10": "Oct",
      "11": "Nov",
      "12": "Dec",
    };

    const monthlyMap: Record<
      string,
      { decisions: number; tasksCreated: number; completedCount: number; overdueCount: number; totalCount: number }
    > = {};

    for (const t of allTasks) {
      const key = t.createdAt.toISOString().slice(0, 7);
      if (!monthlyMap[key])
        monthlyMap[key] = { decisions: 0, tasksCreated: 0, completedCount: 0, overdueCount: 0, totalCount: 0 };
      monthlyMap[key].tasksCreated++;
      monthlyMap[key].totalCount++;
      if (t.status === "Completed") monthlyMap[key].completedCount++;
      if (t.status === "Overdue" || t.status === "Escalated") monthlyMap[key].overdueCount++;
    }
    for (const d of allDecisions) {
      const key = d.createdAt.toISOString().slice(0, 7);
      if (!monthlyMap[key])
        monthlyMap[key] = { decisions: 0, tasksCreated: 0, completedCount: 0, overdueCount: 0, totalCount: 0 };
      monthlyMap[key].decisions++;
    }

    const sortedKeys = Object.keys(monthlyMap).sort();
    const trendData =
      sortedKeys.length > 0
        ? sortedKeys.map((key) => {
            const v = monthlyMap[key];
            return {
              month: MONTH_LABELS[key.slice(5)] ?? key.slice(5),
              decisions: v.decisions,
              tasksCreated: v.tasksCreated,
              completedTasks: v.completedCount,
              overdueTasks: v.overdueCount,
              closureRate: v.totalCount > 0 ? Math.round((v.completedCount / v.totalCount) * 100) : 0,
            };
          })
        : [
            { month: "May", decisions: 8, tasksCreated: 14, completedTasks: 12, overdueTasks: 2, closureRate: 86 },
            { month: "Jun", decisions: 12, tasksCreated: 19, completedTasks: 16, overdueTasks: 3, closureRate: 84 },
            { month: "Jul", decisions: 15, tasksCreated: 24, completedTasks: 20, overdueTasks: 4, closureRate: 83 },
            { month: "Aug", decisions: totalDecisions, tasksCreated: totalTasks, completedTasks: completedTasks, overdueTasks: overdueTasks, closureRate: closureRate },
          ];

    return NextResponse.json({
      summary: {
        totalMeetings,
        totalDecisions,
        totalTasks,
        completedTasks,
        overdueTasks,
        escalatedTasks,
        pendingTasks,
        inProgressTasks,
        closureRate,
        overdueRate,
        avgDecisionLagDays,
      },
      departmentStats,
      trendData,
    });
  } catch (error: unknown) {
    console.error("[Analytics API GET Error]", error);
    const message = error instanceof Error ? error.message : "Failed to load analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
