import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { parseSidenoteMarkdown } from "@/lib/sidenote-parser";

const SIDENOTES_DB_PATH =
  process.env.SIDENOTES_DB_PATH || "";
const WORK_DAILY_FOLDER_ID = 10;

export async function GET() {
  if (!SIDENOTES_DB_PATH) {
    return NextResponse.json(
      { error: "SIDENOTES_DB_PATH not configured" },
      { status: 400 }
    );
  }

  try {
    const sqlite = new Database(SIDENOTES_DB_PATH, { readonly: true });
    const rows = sqlite
      .prepare(
        `SELECT ZTEXT FROM ZNOTE
         WHERE ZFOLDER = ? AND ZISHIDDENDELETED = 0 AND ZTEXT LIKE '%### 2%/%/%'
         ORDER BY ZDATE ASC`
      )
      .all(WORK_DAILY_FOLDER_ID) as { ZTEXT: string }[];
    sqlite.close();

    // Combine all note texts and parse
    const combined = rows.map((r) => r.ZTEXT).join("\n");
    const { entries, errors } = parseSidenoteMarkdown(combined);

    return NextResponse.json({ entries, errors, noteCount: rows.length });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to read SideNotes DB: ${err}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { entries } = (await request.json()) as {
    entries: { date: string; content: string }[];
  };

  let imported = 0;
  let appended = 0;

  for (const entry of entries) {
    const existing = await db
      .select()
      .from(dailyReports)
      .where(eq(dailyReports.date, entry.date));

    if (existing.length > 0) {
      const newOverview = existing[0].overview
        ? `${existing[0].overview}\n\n---\n${entry.content}`
        : entry.content;

      await db
        .update(dailyReports)
        .set({ overview: newOverview, updatedAt: new Date() })
        .where(eq(dailyReports.id, existing[0].id));
      appended++;
    } else {
      await db.insert(dailyReports).values({
        date: entry.date,
        overview: entry.content,
      });
      imported++;
    }
  }

  return NextResponse.json({ imported, appended, total: entries.length });
}
