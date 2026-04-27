import { NextRequest, NextResponse } from "next/server";
import { signToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const storedB64 = process.env.AUTH_PASSWORD_B64;
  if (!storedB64) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const storedPassword = Buffer.from(storedB64, "base64").toString("utf-8");
  if (password !== storedPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await signToken();
  await setSessionCookie(token);

  return NextResponse.json({ success: true });
}
