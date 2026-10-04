/**
 * POST /api/stripe/webhook - Stripe events for CI checkouts.
 *
 * checkout.session.completed (paid) and checkout.session.async_payment_succeeded
 * set first_discount_claimed on the buyer's subscriber record and clear any
 * pending first-class marker. checkout.session.expired on a first-class session
 * clears the pending marker so the person can try again.
 *
 * Only an existing subscriber record is updated: a buyer who never left their
 * email is not added to the mailing list store by paying. The purchase-history
 * lookup in Stripe still covers them.
 *
 * The signature is checked against STRIPE_WEBHOOK_SECRET (a Worker secret,
 * never in source) using Stripe's scheme: HMAC-SHA256 over "<t>.<raw body>",
 * compared with every v1 signature in the header, 5 minute tolerance.
 */

import type { Env } from './index';
import { readSubscriber } from './tickets';

const TOLERANCE_SECONDS = 300;

function hex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function equalHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export async function stripeSignature(secret: string, timestamp: number, payload: string): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
}

export async function verifyStripeSignature(payload: string, header: string, secret: string, nowMs: number): Promise<boolean> {
	let timestamp = NaN;
	const signatures: string[] = [];
	for (const part of header.split(',')) {
		const [k, v] = part.split('=', 2).map((s) => s?.trim());
		if (k === 't') timestamp = Number(v);
		if (k === 'v1' && v) signatures.push(v);
	}
	if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
	if (Math.abs(nowMs / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
	const expected = await stripeSignature(secret, timestamp, payload);
	return signatures.some((sig) => equalHex(sig, expected));
}

interface CheckoutSessionObject {
	id?: string;
	payment_status?: string;
	customer_email?: string | null;
	customer_details?: { email?: string | null } | null;
	metadata?: Record<string, string> | null;
}

function json(body: unknown, status: number): Response {
	return Response.json(body, { status });
}

export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
	if (!env.STRIPE_WEBHOOK_SECRET) return json({ ok: false, error: 'Webhook not configured' }, 500);

	const payload = await request.text();
	const header = request.headers.get('Stripe-Signature') ?? '';
	if (!(await verifyStripeSignature(payload, header, env.STRIPE_WEBHOOK_SECRET, Date.now()))) {
		return json({ ok: false, error: 'Invalid signature' }, 400);
	}

	let event: { type?: string; data?: { object?: CheckoutSessionObject } };
	try {
		event = JSON.parse(payload);
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400);
	}

	const session = event.data?.object;
	const product = session?.metadata?.product ?? '';
	if (!session || !product.startsWith('ci-')) return json({ received: true }, 200);

	const email = (session.customer_details?.email ?? session.customer_email ?? '').trim().toLowerCase();
	if (!email) return json({ received: true }, 200);

	const record = await readSubscriber(env, email);
	if (!record) return json({ received: true }, 200);

	const paid =
		(event.type === 'checkout.session.completed' && session.payment_status === 'paid') ||
		event.type === 'checkout.session.async_payment_succeeded';
	const expiredFirst = event.type === 'checkout.session.expired' && session.metadata?.first_discount === 'true';

	if (paid) {
		const { first_pending_until: _drop, ...rest } = record;
		await env.EMAIL_SUBS.put(email, JSON.stringify({ ...rest, first_discount_claimed: true }));
		console.log('[Stripe webhook] first_discount_claimed', session.id);
	} else if (expiredFirst) {
		const { first_pending_until: _drop, ...rest } = record;
		await env.EMAIL_SUBS.put(email, JSON.stringify(rest));
		console.log('[Stripe webhook] first-class pending cleared', session.id);
	}
	return json({ received: true }, 200);
}
