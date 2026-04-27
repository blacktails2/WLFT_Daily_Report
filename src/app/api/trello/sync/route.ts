import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTrelloCards } from "@/lib/trello";
import { getNextColor } from "@/lib/colors";

interface TrelloConfig {
  apiKey: string;
  token: string;
  boardIds: string[];
  lastSyncAt?: string;
}

export async function POST() {
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

  const config = rows[0].value as TrelloConfig;
  if (!config.boardIds || config.boardIds.length === 0) {
    return NextResponse.json(
      { error: "No boards selected" },
      { status: 400 }
    );
  }

  // Fetch all cards from selected boards, deduplicate by card ID
  const cardMap = new Map<string, { id: string; name: string; closed: boolean }>();
  for (const boardId of config.boardIds) {
    const cards = await getTrelloCards(config.apiKey, config.token, boardId);
    for (const card of cards) cardMap.set(card.id, card);
  }
  const allCards = [...cardMap.values()];

  // Get existing tasks
  const existingTasks = await db.select().from(tasks);
  const existingByTrelloId = new Map(
    existingTasks
      .filter((t) => t.trelloCardId)
      .map((t) => [t.trelloCardId, t])
  );
  const usedColors = existingTasks.filter((t) => !t.archived).map((t) => t.color);

  let added = 0;
  let updated = 0;
  let archived = 0;

  for (const card of allCards) {
    const existing = existingByTrelloId.get(card.id);

    if (existing) {
      // Update name if changed, archive if closed
      const updates: Record<string, unknown> = {};
      if (existing.name !== card.name) updates.name = card.name;
      // Only auto-archive when Trello card is closed; never auto-restore
      // (manual archives must remain archived regardless of Trello state)
      if (card.closed && !existing.archived) updates.archived = true;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await db
          .update(tasks)
          .set(updates)
          .where(eq(tasks.id, existing.id));
        if (updates.archived === true) archived++;
        else updated++;
      }
    } else if (!card.closed) {
      // New card — create task
      const color = getNextColor(usedColors);
      usedColors.push(color);

      const maxOrder = existingTasks.length > 0
        ? Math.max(...existingTasks.map((t) => t.sortOrder)) + 1 + added
        : added;

      await db.insert(tasks).values({
        name: card.name,
        color,
        trelloCardId: card.id,
        sortOrder: maxOrder,
      });
      added++;
    }
  }

  // Update last sync time
  await db
    .update(settings)
    .set({
      value: { ...config, lastSyncAt: new Date().toISOString() },
      updatedAt: new Date(),
    })
    .where(eq(settings.key, "trello"));

  return NextResponse.json({ added, updated, archived });
}
