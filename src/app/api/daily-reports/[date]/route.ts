import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, timeEntries, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  const reports = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.date, date));

  if (reports.length === 0) {
    return NextResponse.json(null);
  }

  const report = reports[0];

  const entries = await db
    .select({
      id: timeEntries.id,
      taskId: timeEntries.taskId,
      hours: timeEntries.hours,
      memo: timeEntries.memo,
      taskName: tasks.name,
      taskColor: tasks.color,
    })
    .from(timeEntries)
    .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .where(eq(timeEntries.reportId, report.id));

  return NextResponse.json({ ...report, entries });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  const deleted = await db
    .delete(dailyReports)
    .where(eq(dailyReports.date, date))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
