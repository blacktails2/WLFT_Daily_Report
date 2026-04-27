import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key));

  if (rows.length === 0) {
    return NextResponse.json(null);
  }

  return NextResponse.json(rows[0].value);
}

export async function POST(request: NextRequest) {
  const { key, value } = await request.json();

  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });

  return NextResponse.json({ success: true });
}
