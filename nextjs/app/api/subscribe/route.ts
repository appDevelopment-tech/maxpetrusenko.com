import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/utils/validators";
import type { SubscribeRequest, SubscribeResponse } from "@/types";
import { getRequestContext } from "@cloudflare/next-on-pages";

// Edge runtime required for Cloudflare Pages
export const runtime = "edge";

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

    // Store in Cloudflare KV
    // Use getRequestContext to access Cloudflare bindings in next-on-pages
    try {
      const { env } = getRequestContext();
      const kv = env?.EMAIL_SUBS as { put: (key: string, value: string) => Promise<void> } | undefined;

      if (kv) {
        await kv.put(email, JSON.stringify({ email, consent, source, ts: Date.now() }));
        console.log("[Subscription saved to KV]", { email, source });
      } else {
        console.log("[Subscription logged - KV binding not found]", { email, source, hasEnv: !!env });
      }
    } catch (kvError) {
      console.error("[KV Error]", kvError);
    }

    return NextResponse.json({ ok: true } as SubscribeResponse, { status: 200 });
  } catch (error) {
    console.error("[Subscription error]", error);
    return NextResponse.json(
      { error: "Subscription failed", ok: false } as SubscribeResponse,
      { status: 500 }
    );
  }
}
