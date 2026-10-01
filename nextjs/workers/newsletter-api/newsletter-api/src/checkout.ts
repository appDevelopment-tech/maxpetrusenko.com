/**
 * POST /api/checkout - builds a Stripe Checkout Session for a drop-in ticket,
 * the intro pack, or a membership, and hands the caller the URL to redirect to.
 *
 * No webhook, no check-in, no QR, no KV ticket record, no CRM sync, no
 * entitlements here - those land in a later, separate PR.
 */

import type { Env } from './index';
import { DROP_IN_LOOKUP_KEY_BY_TYPE, resolveTicketEvent } from './schedule';
import { isPlan, planConfig, PLAN_LOOKUP_KEYS, type Plan } from './plans';
import { createCheckoutSession, findPriceByLookupKey } from './stripe';

interface CheckoutRequest {
	plan?: string;
	date?: string;
}

const DOOR_URL = 'https://miamicontactimprov.com/pay';

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

	const plan = body.plan ?? 'ticket';
	if (!isPlan(plan)) {
		return json({ ok: false, error: 'Unknown plan' }, 400, corsHeaders);
	}

	let lookupKey: string | null;
	let mode: 'payment' | 'subscription';
	let allowPromotionCodes: boolean;
	let metadata: Record<string, string>;
	let successUrl: string;
	let cancelUrl: string;

	if (plan === 'ticket') {
		const resolved = resolveTicketEvent(new Date(), body.date);
		if (resolved === null) {
			// EVENTS is never empty in practice; guard it anyway rather than crash.
			return json({ ok: false, error: 'No events configured' }, 500, corsHeaders);
		}
		if ('error' in resolved) {
			return json({ ok: false, error: 'Unknown class date' }, 400, corsHeaders);
		}

		const { event, closed } = resolved;
		const dropInKey = DROP_IN_LOOKUP_KEY_BY_TYPE[event.type];
		if (closed || dropInKey === null) {
			return json({ closed: true, door_url: DOOR_URL }, 409, corsHeaders);
		}

		lookupKey = dropInKey;
		mode = 'payment';
		allowPromotionCodes = planConfig('ticket').allowPromotionCodes;
		metadata = { class_date: event.date, product: 'ci-ticket', plan: 'ticket' };
		successUrl = `https://miamicontactimprov.com/success?plan=ticket&date=${event.date}&session_id={CHECKOUT_SESSION_ID}`;
		cancelUrl = 'https://miamicontactimprov.com/fundamentals';
	} else {
		const nonTicketPlan = plan as Exclude<Plan, 'ticket'>;
		lookupKey = PLAN_LOOKUP_KEYS[nonTicketPlan];
		const config = planConfig(plan);
		mode = config.mode;
		allowPromotionCodes = config.allowPromotionCodes;
		metadata = { product: `ci-${plan}`, plan };
		successUrl = `https://miamicontactimprov.com/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`;
		cancelUrl = 'https://miamicontactimprov.com/pricing';
	}

	if (!env.STRIPE_SECRET_KEY) {
		return json({ ok: false, error: 'Stripe not configured' }, 500, corsHeaders);
	}

	const price = await findPriceByLookupKey(env.STRIPE_SECRET_KEY, lookupKey);
	if (!price) {
		return json({ ok: false, error: 'Price not configured' }, 500, corsHeaders);
	}

	const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
		mode,
		priceId: price.id,
		allowPromotionCodes,
		successUrl,
		cancelUrl,
		metadata,
	});

	if ('error' in session) {
		return json({ ok: false, error: session.error }, 502, corsHeaders);
	}

	return json({ url: session.url }, 200, corsHeaders);
}
