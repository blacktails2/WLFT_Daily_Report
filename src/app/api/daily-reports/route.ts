import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, timeEntries, tasks } from "@/db/schema";
import { eq, gte, lte, lt, gt, and, asc, desc, inArray } from "drizzle-orm";

async function attachEntries(reports: (typeof dailyReports.$inferSelect)[]) {
  const reportIds = reports.map((r) => r.id);
  const entries =
    reportIds.length > 0
      ? await db
          .select({
            id: timeEntries.id,
            reportId: timeEntries.reportId,
            taskId: timeEntries.taskId,
            hours: timeEntries.hours,
            memo: timeEntries.memo,
            taskName: tasks.name,
            taskColor: tasks.color,
          })
          .from(timeEntries)
          .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
          .where(inArray(timeEntries.reportId, reportIds))
      : [];

  return reports.map((report) => ({
    ...report,
    entries: entries.filter((e) => e.reportId === report.id),
  }));
}

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const around = request.nextUrl.searchParams.get("around");
  const beforeDate = request.nextUrl.searchParams.get("before");
  const afterDate = request.nextUrl.searchParams.get("after");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "0", 10);

  // "around" mode: fetch N reports before and after a date (only days with reports)
  if (around) {
    const count = limit || 10;
    const before = await db
      .select()
      .from(dailyReports)
      .where(lt(dailyReports.date, around))
      .orderBy(desc(dailyReports.date))
      .limit(count);

    const current = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.date, around));

    const after = await db
      .select()
      .from(dailyReports)
      .where(gt(dailyReports.date, around))
      .orderBy(asc(dailyReports.date))
      .limit(count);

    const allReports = [...before.reverse(), ...current, ...after];
    return NextResponse.json(await attachEntries(allReports));
  }

  // "before"/"after" mode: fetch N older/newer reports from a date
  if (beforeDate) {
    const count = limit || 5;
    const reports = await db
      .select()
      .from(dailyReports)
      .where(lt(dailyReports.date, beforeDate))
      .orderBy(desc(dailyReports.date))
      .limit(count);

    return NextResponse.json(await attachEntries(reports.reverse()));
  }

  if (afterDate) {
    const count = limit || 5;
    const reports = await db
      .select()
      .from(dailyReports)
      .where(gt(dailyReports.date, afterDate))
      .orderBy(asc(dailyReports.date))
      .limit(count);

    return NextResponse.json(await attachEntries(reports));
  }

  // Default: date range mode
  const conditions = [];
  if (from) conditions.push(gte(dailyReports.date, from));
  if (to) conditions.push(lte(dailyReports.date, to));

  const reports = await db
    .select()
    .from(dailyReports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(dailyReports.date));

  return NextResponse.json(await attachEntries(reports));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, overview, entries } = body as {
    date: string;
    overview: string;
    entries: { taskId: string; hours: number; memo?: string }[];
  };

  // Upsert daily report
  const existing = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.date, date));

  let reportId: string;

  if (existing.length > 0) {
    reportId = existing[0].id;
    await db
      .update(dailyReports)
      .set({ overview, updatedAt: new Date() })
      .where(eq(dailyReports.id, reportId));

    // Delete existing entries
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.reportId, reportId));
  } else {
    const [report] = await db
      .insert(dailyReports)
      .values({ date, overview })
      .returning();
    reportId = report.id;
  }

  // Insert new entries (only those with hours > 0)
  const validEntries = entries.filter((e) => e.hours > 0);
  if (validEntries.length > 0) {
    await db.insert(timeEntries).values(
      validEntries.map((e) => ({
        reportId,
        taskId: e.taskId,
        hours: e.hours,
        memo: e.memo || null,
      }))
    );
  }

  return NextResponse.json({ id: reportId, date, overview }, { status: 201 });
}
