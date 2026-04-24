import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

const DEFAULT_ONBOARDING_URL = "https://studio.maxpetrusenko.com/api/public/onboarding";

function envValue(key: string): string | null {
  try {
    const env = getRequestContext().env as unknown as Record<string, unknown>;
    const value = env[key];
    if (typeof value === "string" && value.trim()) return value;
  } catch {
    // Local Next dev does not always provide Cloudflare request context.
  }

  const value = process.env[key];
  return value?.trim() ? value : null;
}

export async function POST(request: Request) {
  const endpoint = envValue("TANTRA_STUDIO_PUBLIC_ONBOARDING_URL") || DEFAULT_ONBOARDING_URL;
  const fallbackCalendarUrl = envValue("SOMATIC_CALENDAR_URL");
  const body = await request.json().catch(() => ({}));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const hasOfferSlots =
      Array.isArray((payload.offer as { slots?: unknown[] } | undefined)?.slots) &&
      ((payload.offer as { slots?: unknown[] }).slots?.length ?? 0) > 0;
    const hasBookingUrl =
      typeof payload.bookingUrl === "string" && payload.bookingUrl.trim().length > 0;
    const hasBookingPath =
      typeof payload.bookingPath === "string" && payload.bookingPath.trim().length > 0;

    if (
      fallbackCalendarUrl &&
      !hasBookingUrl &&
      !hasBookingPath &&
      (payload.nextStep === "book" || hasOfferSlots)
    ) {
      payload.bookingUrl = fallbackCalendarUrl;
    }

    return NextResponse.json(payload, {
      status: response.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "somatic_intake_unavailable" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
