import { NextResponse } from "next/server";
import {
  createAdminSession,
  getAdminPassword,
  getSessionCookieName,
} from "@/lib/concierge/auth";

export const runtime = "edge";

interface SignInBody {
  password?: string;
}

export async function POST(request: Request) {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Admin sign-in is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as SignInBody;
  if ((body.password ?? "") !== configuredPassword) {
    return NextResponse.json(
      { error: "Invalid password." },
      { status: 401 }
    );
  }

  const session = await createAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Session secret is missing." },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getSessionCookieName(),
    value: session,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
