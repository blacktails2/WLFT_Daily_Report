import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, timeEntries, tasks } from "@/db/schema";
import { eq, gte, lte, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to are required" },
      { status: 400 }
    );
  }

  // Task totals for the period
  const totals = await db
    .select({
      taskId: tasks.id,
      taskName: tasks.name,
      taskColor: tasks.color,
      totalHours: sql<number>`sum(${timeEntries.hours})`.as("total_hours"),
    })
    .from(timeEntries)
    .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .innerJoin(dailyReports, eq(timeEntries.reportId, dailyReports.id))
    .where(
      and(gte(dailyReports.date, from), lte(dailyReports.date, to))
    )
    .groupBy(tasks.id, tasks.name, tasks.color);

  // Per-day breakdown for stacked bar chart
  const daily = await db
    .select({
      date: dailyReports.date,
      taskId: tasks.id,
      taskName: tasks.name,
      taskColor: tasks.color,
      hours: timeEntries.hours,
    })
    .from(timeEntries)
    .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .innerJoin(dailyReports, eq(timeEntries.reportId, dailyReports.id))
    .where(
      and(gte(dailyReports.date, from), lte(dailyReports.date, to))
    );

  // Group daily data by date
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const row of daily) {
    if (!dailyMap[row.date]) dailyMap[row.date] = {};
    dailyMap[row.date][row.taskName] = row.hours;
  }

  const dailyData = Object.entries(dailyMap)
    .map(([date, tasks]) => ({ date, ...tasks }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totals: totals.map((t) => ({
      ...t,
      totalHours: Number(t.totalHours),
    })),
    daily: dailyData,
  });
}
