import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseSidenoteMarkdown } from "@/lib/sidenote-parser";

export async function POST(request: NextRequest) {
  const { content } = await request.json();

  const { entries, errors } = parseSidenoteMarkdown(content);

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  let imported = 0;
  let appended = 0;

  for (const entry of entries) {
    const existing = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.date, entry.date));

    if (existing.length > 0) {
      // Append to existing overview
      const newOverview = existing[0].overview
        ? `${existing[0].overview}\n\n---\n${entry.content}`
        : entry.content;

      await db
        .update(dailyReports)
        .set({ overview: newOverview, updatedAt: new Date() })
        .where(eq(dailyReports.id, existing[0].id));
      appended++;
    } else {
      // Create new report
      await db.insert(dailyReports).values({
        date: entry.date,
        overview: entry.content,
      });
      imported++;
    }
  }

  return NextResponse.json({ imported, appended, total: entries.length });
}
