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
import { usableEvidence, type Evidence } from './verify';
import { createCheckoutSession, findPriceByLookupKey, stripeModeError } from './stripe';
import {
	firstClassEligibility,
	isKnownAmbassador,
	parseTicket,
	PENDING_TTL_MS,
	SESSION_TTL_MS,
	setFirstPending,
	TICKET_LOOKUP_KEYS,
	type TicketChoice,
} from './tickets';

interface CheckoutRequest {
	kind?: string;
	event_date?: string;
	// Ticket type and its fields, see src/tickets.ts. All optional: a button that
	// sends only { kind } still buys the $20 early ticket exactly as before.
	ticket_type?: string;
	verification_id?: string;
	referrer?: string;
	email?: string;
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

	const parsed = parseTicket(body as Record<string, unknown>);
	if (!parsed.ok) {
		return json({ ok: false, error: parsed.error }, 400, corsHeaders);
	}
	const ticket = parsed.ticket;
	// The $15 offers are for the Friday class only in this slice.
	if (ticket.type !== 'early' && kind !== 'class') {
		return json({ ok: false, error: 'Ticket type not available for this kind' }, 400, corsHeaders);
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
	const modeError = stripeModeError(env.STRIPE_SECRET_KEY, env.STRIPE_MODE);
	if (modeError) {
		console.error('[Checkout refused]', modeError);
		return json({ ok: false, error: 'Stripe not configured' }, 500, corsHeaders);
	}

	const nowMs = Date.now();
	if (ticket.type === 'first') {
		// One answer for every refusal (never issued, already paid, a session
		// already open, Stripe unreachable): the response must not reveal whether
		// an address has bought a ticket.
		const eligibility = await firstClassEligibility(env, ticket.email!, env.STRIPE_SECRET_KEY, nowMs);
		if (eligibility !== 'eligible') {
			return json({ ok: false, error: 'first_offer_unavailable' }, 409, corsHeaders);
		}
		// Written before the session exists, so a second request that reads it
		// is refused. Two requests that both read before either writes get the
		// same session from Stripe via the idempotency key below.
		await setFirstPending(env, ticket.email!, nowMs + PENDING_TTL_MS);
	}

	// Community: verified evidence for this email (src/verify.ts), or no $15.
	let evidence: Evidence | null = null;
	if (ticket.type === 'community') {
		evidence = await usableEvidence(env, ticket.verification_id, ticket.email!, nowMs);
		if (!evidence) return json({ ok: false, error: 'community_not_verified' }, 403, corsHeaders);
	}

	const referrerVerified = ticket.type === 'referral' ? await isKnownAmbassador(env, ticket.referrer!) : false;

	const lookupKey = ticket.type === 'early' ? KIND_LOOKUP_KEYS[kind] : TICKET_LOOKUP_KEYS[ticket.type];
	const price = await findPriceByLookupKey(env.STRIPE_SECRET_KEY, lookupKey);
	if (!price) {
		return json({ ok: false, error: 'Price not configured' }, 500, corsHeaders);
	}

	const site = (env.SITE_URL ?? 'https://miamicontactimprov.com').replace(/\/$/, '');
	const successUrl =
		`${site}/success?kind=${kind}&event_date=${event.date}` +
		`${price.unitAmount ? `&amount=${price.unitAmount}` : ''}&ticket_type=${ticket.type}&session_id={CHECKOUT_SESSION_ID}`;

	const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
		priceId: price.id,
		// No promotion codes: Stripe refuses them on the custom-amount ($20-40)
		// price, and the $15 offers never stack.
		allowPromotionCodes: false,
		successUrl,
		cancelUrl: ticket.type === 'early' ? `${site}/fundamentals` : `${site}/tickets`,
		customerEmail: ticket.email,
		expiresAt: sessionExpiry(nowMs),
		idempotencyKey: await idempotencyKey(request, ticket, event.date, nowMs),
		// Stripe metadata is the record of which offer a sale used. Empty values
		// are dropped by createCheckoutSession.
		metadata: {
			class_date: event.date,
			event: event.date,
			kind,
			product: `ci-${kind}`,
			ticket_type: ticket.type,
			share_url: evidence?.share_url ?? '',
			verified: evidence ? 'true' : '',
			method: evidence?.method ?? '',
			verification_id: evidence?.id ?? '',
			referrer: ticket.referrer ?? '',
			referrer_verified: ticket.type === 'referral' ? String(referrerVerified) : '',
			first_discount: ticket.type === 'first' ? 'true' : '',
		},
	});

	if ('error' in session) {
		if (ticket.type === 'first') await setFirstPending(env, ticket.email!, null);
		return json({ ok: false, error: session.error }, 502, corsHeaders);
	}

	return json({ url: session.url }, 200, corsHeaders);
}

// Bucketed to the minute so two requests in the same minute send identical
// parameters (Stripe rejects a reused idempotency key with different ones).
// Bucket start + 31 min is always at least 30 min from now, Stripe's minimum.
function sessionExpiry(nowMs: number): number {
	const minute = Math.floor(nowMs / 60000) * 60;
	return minute + SESSION_TTL_MS / 1000;
}

async function sha256(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// email|event|ticket_type|minute for the first-class price. The other ticket
// types carry no email, so the client IP stands in for it, plus the offer's own
// fields; without an IP every request is unique (no dedupe, never a shared
// session between two strangers).
async function idempotencyKey(request: Request, ticket: TicketChoice, eventDate: string, nowMs: number): Promise<string> {
	const minute = Math.floor(nowMs / 60000);
	if (ticket.email) return `ci-${ticket.type}-${await sha256(`${ticket.email}|${eventDate}|${ticket.type}|${minute}`)}`;
	const ip = request.headers.get('CF-Connecting-IP');
	if (!ip) return `ci-${crypto.randomUUID()}`;
	const fields = [ip, eventDate, ticket.type, ticket.referrer ?? '', minute];
	return `ci-${await sha256(fields.join('|'))}`;
}
