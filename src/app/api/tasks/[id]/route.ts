import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, timeEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) { updates.name = body.name; updates.nameOverridden = true; }
  if (body.color !== undefined) updates.color = body.color;
  if (body.archived !== undefined) updates.archived = body.archived;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const [task] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Delete associated time entries first
  await db.delete(timeEntries).where(eq(timeEntries.taskId, id));

  const [task] = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
