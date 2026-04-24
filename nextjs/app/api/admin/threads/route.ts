import { NextResponse } from "next/server";
import { listConciergeThreads } from "@/lib/concierge/storage";
import {
  getSessionCookieName,
  verifyAdminSession,
} from "@/lib/concierge/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieValue =
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${getSessionCookieName()}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? null;

  const authorized = await verifyAdminSession(cookieValue);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await listConciergeThreads();
  return NextResponse.json({ threads });
}
