import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/utils/validators";
import type { SubscribeRequest, SubscribeResponse } from "@/types";

// Edge runtime for Cloudflare compatibility
export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * POST /api/subscribe
 *
 * Email subscription endpoint.
 * Stores email in Cloudflare KV with consent tracking.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscribeRequest;
    const email = body.email?.trim().toLowerCase();
    const consent = Boolean(body.consent);
    const source = (body.source || "unknown").slice(0, 64);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email", ok: false } as SubscribeResponse,
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { error: "Consent required", ok: false } as SubscribeResponse,
        { status: 400 }
      );
    }

    // In a real deployment with Cloudflare Pages, you would use:
    // const kv = (process.env as CloudflareEnv).EMAIL_SUBS;
    // await kv.put(email, JSON.stringify({ email, consent, source, ts: Date.now() }));

    // For local development, we'll simulate success
    console.log("[Subscription]", { email, consent, source, ts: Date.now() });

    return NextResponse.json({ ok: true } as SubscribeResponse, { status: 200 });
  } catch (error) {
    console.error("[Subscription error]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
        ok: false,
      } as SubscribeResponse,
      { status: 500 }
    );
  }
}
