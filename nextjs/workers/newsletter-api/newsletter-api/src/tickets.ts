/**
 * Ticket records. One paid Stripe Checkout session = one ticket.
 *
 * The ticket id is HMAC-SHA256(TICKET_SECRET, session id), cut to 128 bits. That makes it
 * unguessable (it is the QR's secret), signed (nobody can mint one without the secret),
 * and deterministic: the webhook and the success-page verify endpoint both derive the same
 * id for a session, so whichever runs first creates the ticket and the other finds it.
 * No lock is needed and a Stripe retry can never create a second ticket.
 *
 * KV layout (binding TICKETS):
 *   tkt:<ticketId>                   -> Ticket JSON
 *   date:<YYYY-MM-DD>:<ticketId>     -> '1'  (index: list a date's attendees by prefix)
 */

import type { Env } from './index';
import { cleanName } from './common';
import { EVENTS } from './schedule';

export const CI_PRODUCT = /^ci-(class|jam|combo)$/;

export const CHECKIN_BASE = 'https://miamicontactimprov.com/checkin/';

export interface Ticket {
	id: string;
	session_id: string;
	name: string;
	email: string;
	phone: string;
	event_date: string;
	kind: string;
	amount: number; // minor units (cents)
	currency: string;
	created_at: string;
	checked_in_at: string | null;
	email_sent_at: string | null;
	email_id: string | null;
	email_error: string | null;
}

// The slice of a Stripe Checkout Session we read. Both the webhook event and
// GET /v1/checkout/sessions/:id deliver this shape.
export interface StripeSession {
	id: string;
	payment_status?: string;
	amount_total?: number | null;
	currency?: string | null;
	customer_details?: { name?: string | null; email?: string | null; phone?: string | null } | null;
	metadata?: Record<string, string> | null;
}

function hex(bytes: ArrayBuffer): string {
	return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function ticketIdFor(secret: string, sessionId: string): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`ci-ticket:${sessionId}`));
	return hex(mac).slice(0, 32);
}

export function checkinUrl(env: Env, ticketId: string): string {
	return `${env.CHECKIN_BASE_URL || CHECKIN_BASE}${ticketId}`;
}

export function isTicketId(value: string): boolean {
	return /^[0-9a-f]{32}$/.test(value);
}

export async function getTicket(env: Env, id: string): Promise<Ticket | null> {
	const raw = await env.TICKETS?.get(`tkt:${id}`);
	return raw ? (JSON.parse(raw) as Ticket) : null;
}

export async function saveTicket(env: Env, ticket: Ticket): Promise<void> {
	await env.TICKETS!.put(`tkt:${ticket.id}`, JSON.stringify(ticket));
}

/** Attendee ticket ids for one event date, for a host's list. */
export async function listTicketIdsForDate(env: Env, date: string): Promise<string[]> {
	const prefix = `date:${date}:`;
	const ids: string[] = [];
	let cursor: string | undefined;
	do {
		const page = await env.TICKETS!.list({ prefix, cursor });
		for (const key of page.keys) ids.push(key.name.slice(prefix.length));
		cursor = page.list_complete === false ? page.cursor : undefined;
	} while (cursor);
	return ids;
}

export type CreateResult = { ticket: Ticket; created: boolean } | { skip: string };

/**
 * Creates the ticket for a paid session, or returns the one that already exists.
 * `skip` means this session is not ours to ticket (unpaid, or not a class checkout),
 * which the webhook acknowledges with 200 so Stripe stops retrying.
 */
export async function ensureTicket(env: Env, session: StripeSession, now = new Date()): Promise<CreateResult> {
	if (!env.TICKETS || !env.TICKET_SECRET) throw new Error('tickets not configured');
	if (session.payment_status !== 'paid') return { skip: 'not paid' };
	const eventDate = session.metadata?.class_date;
	if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { skip: 'no class_date metadata' };
	// The Stripe account is shared with other products: only tickets we created in
	// checkout.ts (metadata.product = ci-<kind>, for a date on our schedule) are ours.
	if (!CI_PRODUCT.test(session.metadata?.product ?? '')) return { skip: 'not a CI product' };
	if (!EVENTS.some((e) => e.date === eventDate)) return { skip: 'unknown class_date' };

	const id = await ticketIdFor(env.TICKET_SECRET, session.id);
	const existing = await getTicket(env, id);
	if (existing) return { ticket: existing, created: false };

	const email = (session.customer_details?.email ?? '').trim();
	const ticket: Ticket = {
		id,
		session_id: session.id,
		name: cleanName(session.customer_details?.name ?? ''),
		email: email.toLowerCase(),
		phone: (session.customer_details?.phone ?? '').trim().slice(0, 32),
		event_date: eventDate,
		kind: session.metadata?.kind ?? 'class',
		amount: session.amount_total ?? 0,
		currency: (session.currency ?? 'usd').toLowerCase(),
		created_at: now.toISOString(),
		checked_in_at: null,
		email_sent_at: null,
		email_id: null,
		email_error: null,
	};
	// Re-read right before writing: another run (webhook vs success page) may have created
	// the ticket, or already sent the email, while we were building this one. Never
	// overwrite an existing record.
	const raced = await getTicket(env, id);
	if (raced) return { ticket: raced, created: false };
	await saveTicket(env, ticket);
	await env.TICKETS.put(`date:${eventDate}:${id}`, '1');
	return { ticket, created: true };
}
