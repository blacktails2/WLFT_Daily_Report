import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, timeEntries, dailyReports } from "@/db/schema";
import { eq, asc, desc, sql, max } from "drizzle-orm";
import { getNextColor } from "@/lib/colors";

export async function GET(request: NextRequest) {
  const includeArchived =
    request.nextUrl.searchParams.get("includeArchived") === "true";
  const sortByRecent =
    request.nextUrl.searchParams.get("sortByRecent") === "true";

  if (sortByRecent) {
    const conditions = includeArchived ? undefined : eq(tasks.archived, false);

    const allTasks = await db
      .select()
      .from(tasks)
      .where(conditions);

    // Get last used date per task
    const lastUsedRows = await db
      .select({
        taskId: timeEntries.taskId,
        lastDate: max(dailyReports.date).as("last_date"),
      })
      .from(timeEntries)
      .innerJoin(dailyReports, eq(timeEntries.reportId, dailyReports.id))
      .groupBy(timeEntries.taskId);

    const lastUsedMap = new Map(
      lastUsedRows.map((r) => [r.taskId, r.lastDate])
    );

    // Sort: most recently used first, then most recently created
    const sorted = allTasks.sort((a, b) => {
      const aDate = lastUsedMap.get(a.id) || "";
      const bDate = lastUsedMap.get(b.id) || "";
      const aKey = aDate || a.createdAt.toISOString().slice(0, 10);
      const bKey = bDate || b.createdAt.toISOString().slice(0, 10);
      return bKey.localeCompare(aKey);
    });

    return NextResponse.json(sorted);
  }

  const result = includeArchived
    ? await db.select().from(tasks).orderBy(asc(tasks.sortOrder))
    : await db
        .select()
        .from(tasks)
        .where(eq(tasks.archived, false))
        .orderBy(asc(tasks.sortOrder));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const existing = await db
    .select({ color: tasks.color })
    .from(tasks)
    .where(eq(tasks.archived, false));
  const usedColors = existing.map((t) => t.color);
  const color = body.color || getNextColor(usedColors);

  const maxOrder = await db
    .select({ sortOrder: tasks.sortOrder })
    .from(tasks)
    .orderBy(asc(tasks.sortOrder));
  const nextOrder =
    maxOrder.length > 0
      ? Math.max(...maxOrder.map((t) => t.sortOrder)) + 1
      : 0;

  const [task] = await db
    .insert(tasks)
    .values({
      name: body.name,
      color,
      sortOrder: nextOrder,
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}
