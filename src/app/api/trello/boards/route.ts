import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTrelloBoards } from "@/lib/trello";

export async function GET() {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "trello"));

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Trello not configured" },
      { status: 400 }
    );
  }

  const config = rows[0].value as { apiKey: string; token: string };
  const boards = await getTrelloBoards(config.apiKey, config.token);

  return NextResponse.json(boards);
}
