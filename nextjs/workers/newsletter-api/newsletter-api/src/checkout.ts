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
import { createCheckoutSession, findPriceByLookupKey } from './stripe';
import { firstClassEligibility, parseTicket, TICKET_LOOKUP_KEYS } from './tickets';

interface CheckoutRequest {
	kind?: string;
	event_date?: string;
	// Ticket type and its fields, see src/tickets.ts. All optional: a button that
	// sends only { kind } still buys the $20 early ticket exactly as before.
	ticket_type?: string;
	share_channel?: string;
	handle?: string;
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

	if (ticket.type === 'first') {
		const eligibility = await firstClassEligibility(env, ticket.email!, env.STRIPE_SECRET_KEY);
		if (eligibility === 'not_issued') {
			return json({ ok: false, error: 'first_offer_not_issued' }, 403, corsHeaders);
		}
		if (eligibility === 'claimed') {
			return json({ ok: false, error: 'first_discount_claimed' }, 409, corsHeaders);
		}
		if (eligibility === 'unknown') {
			return json({ ok: false, error: 'Could not check your first-class price, try again' }, 502, corsHeaders);
		}
	}

	const lookupKey = ticket.type === 'early' ? KIND_LOOKUP_KEYS[kind] : TICKET_LOOKUP_KEYS[ticket.type];
	const price = await findPriceByLookupKey(env.STRIPE_SECRET_KEY, lookupKey);
	if (!price) {
		return json({ ok: false, error: 'Price not configured' }, 500, corsHeaders);
	}

	const successUrl =
		`https://miamicontactimprov.com/success?kind=${kind}&event_date=${event.date}` +
		`&amount=${price.unitAmount}&ticket_type=${ticket.type}&session_id={CHECKOUT_SESSION_ID}`;

	const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
		priceId: price.id,
		// Early keeps promotion codes. The $15 offers do not: nothing stacks.
		allowPromotionCodes: ticket.type === 'early',
		successUrl,
		cancelUrl: ticket.type === 'early' ? 'https://miamicontactimprov.com/fundamentals' : 'https://miamicontactimprov.com/tickets',
		customerEmail: ticket.type === 'first' ? ticket.email : undefined,
		// Stripe metadata is the record of which offer a sale used. Empty values
		// are dropped by createCheckoutSession.
		metadata: {
			class_date: event.date,
			event: event.date,
			kind,
			product: `ci-${kind}`,
			ticket_type: ticket.type,
			share_channel: ticket.share_channel ?? '',
			handle: ticket.handle ?? '',
			referrer: ticket.referrer ?? '',
			first_discount: ticket.type === 'first' ? 'true' : '',
		},
	});

	if ('error' in session) {
		return json({ ok: false, error: session.error }, 502, corsHeaders);
	}

	return json({ url: session.url }, 200, corsHeaders);
}
