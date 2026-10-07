/**
 * POST /api/checkout - builds a Stripe Checkout Session for a drop-in ticket
 * (class, jam, or class+jam combo) and hands the caller the URL to redirect to.
 *
 * Memberships (monthly/annual) and the intro 3-class pack are deferred -- see
 * docs/plans/pricing-events-config.md in the site repo (maxpetrusenko/
 * miamicontactimprov). No webhook, no check-in, no QR, no KV ticket record, no
 * CRM sync, no entitlements here either - those land in a later, separate PR.
 */

import type { Env } from './index';
import { KIND_LOOKUP_KEYS, resolveEvent, type DropInKind } from './schedule';
import { createCheckoutSession, findPriceByLookupKey, findUsablePromotionCode } from './stripe';
import { normalizeTicketCode } from './links';

interface CheckoutRequest {
	kind?: string;
	event_date?: string;
	code?: unknown;
}

const DOOR_URL = 'https://miamicontactimprov.com/pay';
const KINDS: DropInKind[] = ['class', 'jam', 'combo'];

function isKind(value: unknown): value is DropInKind {
	return typeof value === 'string' && (KINDS as string[]).includes(value);
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
	return Response.json(body, { status, headers: corsHeaders });
}

export async function handleCheckout(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	let body: CheckoutRequest;
	try {
		body = (await request.json()) as CheckoutRequest;
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, corsHeaders);
	}

	// 'class' is the only kind with a real bookable date today, so a button
	// that omits `kind` entirely (the common case) still does the right thing.
	const kind = body.kind ?? 'class';
	if (!isKind(kind)) {
		return json({ ok: false, error: 'Unknown kind' }, 400, corsHeaders);
	}

	const resolved = resolveEvent(new Date(), kind, body.event_date);
	if (resolved === null) {
		// EVENTS is never empty in practice; guard it anyway rather than crash.
		return json({ ok: false, error: 'No events configured' }, 500, corsHeaders);
	}
	if ('error' in resolved) {
		if (resolved.error === 'unknown_date') {
			return json({ ok: false, error: 'Unknown class date' }, 400, corsHeaders);
		}
		// kind_unavailable: nothing sellable online for this kind yet (e.g. jam/
		// combo before any such date exists in EVENTS). Reads the same to the
		// caller as a time-based cutoff: not sellable online right now, door is
		// the fallback either way.
		return json({ closed: true, door_url: DOOR_URL }, 409, corsHeaders);
	}

	const { event, closed } = resolved;
	if (closed) {
		return json({ closed: true, door_url: DOOR_URL }, 409, corsHeaders);
	}

	if (!env.STRIPE_SECRET_KEY) {
		return json({ ok: false, error: 'Stripe not configured' }, 500, corsHeaders);
	}

	const lookupKey = KIND_LOOKUP_KEYS[kind];
	const price = await findPriceByLookupKey(env.STRIPE_SECRET_KEY, lookupKey);
	if (!price) {
		return json({ ok: false, error: 'Price not configured' }, 500, corsHeaders);
	}

	const successUrl =
		`https://miamicontactimprov.com/success?kind=${kind}&event_date=${event.date}` +
		`&amount=${price.unitAmount}&session_id={CHECKOUT_SESSION_ID}`;

	// A code the visitor arrived with (the /t/ link) is applied directly. Anything wrong
	// with it (unknown, used, expired) falls back to the normal checkout with the code
	// box, so a bad code never costs a sale; the reply says which happened.
	let promotionCodeId: string | undefined;
	let codeStatus: 'applied' | 'invalid' | undefined;
	if (body.code !== undefined && body.code !== null && body.code !== '') {
		const code = normalizeTicketCode(body.code);
		const found = code ? await findUsablePromotionCode(env.STRIPE_SECRET_KEY, code, Math.floor(Date.now() / 1000)) : null;
		promotionCodeId = found ?? undefined;
		codeStatus = found ? 'applied' : 'invalid';
	}

	const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
		priceId: price.id,
		allowPromotionCodes: true, // all three drop-in kinds allow promo codes
		promotionCodeId,
		successUrl,
		cancelUrl: 'https://miamicontactimprov.com/fundamentals',
		metadata: { class_date: event.date, kind, product: `ci-${kind}` },
	});

	if ('error' in session) {
		return json({ ok: false, error: session.error }, 502, corsHeaders);
	}

	return json({ url: session.url, ...(codeStatus ? { code_status: codeStatus } : {}) }, 200, corsHeaders);
}
