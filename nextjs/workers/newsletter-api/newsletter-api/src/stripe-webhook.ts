/**
 * POST /api/stripe/webhook: Stripe tells us a Checkout Session was paid; we write the
 * ticket and send the confirmation. GET /api/ticket?session_id=cs_...: the success page
 * asks us to confirm the payment with Stripe and hand back the ticket's QR.
 */

import type { Env } from './index';
import { fetchSession, StripeUnavailableError } from './stripe';
import { sendTicketEmail } from './ticket-email';
import { qrSvg } from './qr';
import { checkinUrl, ensureTicket, type StripeSession } from './tickets';
import { handleMembershipEvent } from './membership';

const TOLERANCE_SECONDS = 300;

function hexToBytes(hex: string): Uint8Array | null {
	if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null;
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/**
 * Verifies a `Stripe-Signature` header against the raw request body: HMAC-SHA256 of
 * `${timestamp}.${body}` with the endpoint secret, any `v1` entry may match (Stripe sends
 * two while a secret is being rolled), timestamp within five minutes. `crypto.subtle.verify`
 * compares in constant time.
 */
export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
	if (!header || !secret) return false;
	let timestamp = '';
	const signatures: string[] = [];
	for (const part of header.split(',')) {
		const [key, value] = part.split('=', 2);
		if (key.trim() === 't') timestamp = (value ?? '').trim();
		if (key.trim() === 'v1' && value) signatures.push(value.trim());
	}
	const t = Number(timestamp);
	if (!timestamp || !Number.isFinite(t) || signatures.length === 0) return false;
	if (Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;

	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
	const signed = new TextEncoder().encode(`${timestamp}.${rawBody}`);
	for (const sig of signatures) {
		const bytes = hexToBytes(sig);
		if (bytes && (await crypto.subtle.verify('HMAC', key, bytes, signed))) return true;
	}
	return false;
}

const HANDLED_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
// Membership (subscription) events. A checkout.session.completed in subscription mode is a
// membership; in payment mode it is a ticket.
const MEMBERSHIP_ONLY_EVENTS = ['invoice.paid', 'customer.subscription.updated', 'customer.subscription.deleted', 'charge.refunded', 'charge.dispute.created'];

export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
	if (!env.STRIPE_WEBHOOK_SECRET || !env.TICKETS || !env.TICKET_SECRET) {
		return Response.json({ ok: false, error: 'Ticketing not configured' }, { status: 500 });
	}
	const rawBody = await request.text();
	if (!(await verifyStripeSignature(rawBody, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))) {
		return Response.json({ ok: false, error: 'Bad signature' }, { status: 400 });
	}

	let event: { id?: string; type?: string; created?: number; data?: { object?: StripeSession } };
	try {
		event = JSON.parse(rawBody);
	} catch {
		return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
	}
	if (event.type && MEMBERSHIP_ONLY_EVENTS.includes(event.type)) return handleMembershipEvent(env, event);
	if (HANDLED_EVENTS.includes(event.type ?? '') && event.data?.object?.mode === 'subscription') return handleMembershipEvent(env, event);
	const session = event.data?.object;
	if (!event.type || !HANDLED_EVENTS.includes(event.type) || !session?.id) {
		return Response.json({ ok: true, ignored: event.type ?? 'unknown' });
	}

	try {
		const result = await ensureTicket(env, session);
		if ('skip' in result) return Response.json({ ok: true, skipped: result.skip });
		const email = await sendTicketEmail(env, result.ticket);
		return Response.json({ ok: true, ticket_id: result.ticket.id, created: result.created, email });
	} catch (error) {
		// 500 makes Stripe retry; ensureTicket and sendTicketEmail are both safe to repeat.
		console.error('[Ticket webhook failed]', String(error));
		return Response.json({ ok: false, error: 'Processing failed' }, { status: 500 });
	}
}

export async function handleTicketLookup(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const sessionId = new URL(request.url).searchParams.get('session_id') ?? '';
	if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
		return Response.json({ ok: false, error: 'Invalid session_id' }, { status: 400, headers: corsHeaders });
	}
	if (!env.STRIPE_SECRET_KEY || !env.TICKETS || !env.TICKET_SECRET) {
		return Response.json({ ok: false, error: 'Ticketing not configured' }, { status: 500, headers: corsHeaders });
	}
	let session: StripeSession | null;
	try {
		session = await fetchSession(env.STRIPE_SECRET_KEY, sessionId);
	} catch (error) {
		if (!(error instanceof StripeUnavailableError)) throw error;
		console.error('[Ticket lookup] Stripe unavailable', error.message);
		return Response.json({ ok: false, error: 'Stripe unavailable' }, { status: 502, headers: corsHeaders });
	}
	if (!session) return Response.json({ ok: false, error: 'Unknown session' }, { status: 404, headers: corsHeaders });
	if (session.payment_status !== 'paid') {
		return Response.json({ ok: false, paid: false }, { status: 402, headers: corsHeaders });
	}
	try {
		const result = await ensureTicket(env, session);
		if ('skip' in result) return Response.json({ ok: false, error: result.skip }, { status: 422, headers: corsHeaders });
		const t = result.ticket;
		const url = checkinUrl(env, t.id);
		return Response.json(
			{ ok: true, paid: true, ticket_id: t.id, event_date: t.event_date, kind: t.kind, amount: t.amount, checkin_url: url, qr_svg: qrSvg(url) },
			{ headers: corsHeaders },
		);
	} catch (error) {
		console.error('[Ticket lookup failed]', String(error));
		return Response.json({ ok: false, error: 'Processing failed' }, { status: 500, headers: corsHeaders });
	}
}
