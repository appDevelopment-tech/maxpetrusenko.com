/**
 * Ticket types for the Friday class, and the "New here?" first-class capture.
 *
 * Pricing (Max, 2026-10-04, docs/plans/pricing-ambassador-2026-10-04.md in the
 * site repo):
 *   early      $20  buy online ahead. Promotion codes still apply.
 *   community  $15  "Share & unlock": the buyer names where they shared the
 *                   class (channel + handle/group). Self-reported, never verified.
 *   first      $15  first class for a new person who left an email. Gone after
 *                   their first paid CI checkout.
 *   referral   $15  arrived through miamicontactimprov.com/fr/<name>.
 *
 * Nothing stacks: a session carries exactly one price, and the $15 sessions do
 * not accept promotion codes, so $15 is the floor online. Stripe Checkout
 * metadata is the record of which offer a sale used.
 */

import type { Env } from './index';
import { hasCompletedCiPurchase } from './stripe';

export type TicketType = 'early' | 'community' | 'first' | 'referral';

export const TICKET_TYPES: TicketType[] = ['early', 'community', 'first', 'referral'];

// One $15 price serves all three reduced offers; metadata tells them apart.
export const TICKET_LOOKUP_KEYS: Record<TicketType, string> = {
	early: 'ci-ticket-online-friday',
	community: 'ci-class-15',
	first: 'ci-class-15',
	referral: 'ci-class-15',
};

export const SHARE_CHANNELS = ['instagram_story', 'whatsapp_group', 'facebook_group', 'other'] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export interface TicketChoice {
	type: TicketType;
	share_channel?: ShareChannel;
	handle?: string;
	referrer?: string;
	email?: string;
}

export function isValidEmail(email: string): boolean {
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// A referrer is the <name> in /fr/<name>: lowercase letters, digits and dashes,
// up to 40 characters. Anything else is rejected rather than "cleaned" into a
// different name that would credit the wrong person.
export function normalizeReferrer(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const value = raw.trim().toLowerCase();
	return /^[a-z0-9][a-z0-9-]{0,39}$/.test(value) ? value : null;
}

// A handle or group name is free text the buyer typed. Control characters are
// dropped and the length is capped well under Stripe's 500-char metadata limit.
export function cleanHandle(raw: unknown): string {
	if (typeof raw !== 'string') return '';
	return raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
}

export type ParsedTicket = { ok: true; ticket: TicketChoice } | { ok: false; error: string };

export function parseTicket(body: Record<string, unknown>): ParsedTicket {
	const type = body.ticket_type ?? 'early';
	if (typeof type !== 'string' || !(TICKET_TYPES as string[]).includes(type)) {
		return { ok: false, error: 'Unknown ticket type' };
	}
	switch (type as TicketType) {
		case 'early':
			return { ok: true, ticket: { type: 'early' } };
		case 'community': {
			const channel = body.share_channel;
			if (typeof channel !== 'string' || !(SHARE_CHANNELS as readonly string[]).includes(channel)) {
				return { ok: false, error: 'Pick where you shared it' };
			}
			const handle = cleanHandle(body.handle);
			if (!handle) return { ok: false, error: 'Add your handle or the group name' };
			return { ok: true, ticket: { type: 'community', share_channel: channel as ShareChannel, handle } };
		}
		case 'referral': {
			const referrer = normalizeReferrer(body.referrer);
			if (!referrer) return { ok: false, error: 'Unknown referral link' };
			return { ok: true, ticket: { type: 'referral', referrer } };
		}
		case 'first': {
			const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
			if (!isValidEmail(email)) return { ok: false, error: 'Email required for the first-class price' };
			return { ok: true, ticket: { type: 'first', email } };
		}
	}
}

// The subscriber record in EMAIL_SUBS, as far as this file reads or writes it.
export interface SubscriberRecord {
	email?: string;
	consent?: boolean;
	source?: string;
	first_offer_issued_at?: number;
	first_discount_claimed?: boolean;
	// Set just before a first-class Checkout Session is created, cleared by the
	// webhook when that session is paid or expires. While it is in the future,
	// no second first-class session is created for the email.
	first_pending_until?: number;
	[key: string]: unknown;
}

// Checkout sessions expire after 31 minutes (Stripe's minimum is 30); the
// pending marker outlives the session by a minute so the two never overlap.
export const SESSION_TTL_MS = 31 * 60 * 1000;
export const PENDING_TTL_MS = SESSION_TTL_MS + 60 * 1000;

export function normalizeEmail(raw: unknown): string {
	return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

export async function readSubscriber(env: Env, email: string): Promise<SubscriberRecord | null> {
	const raw = await env.EMAIL_SUBS.get(email);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SubscriberRecord;
	} catch {
		return null;
	}
}

async function writeSubscriber(env: Env, email: string, record: SubscriberRecord): Promise<void> {
	await env.EMAIL_SUBS.put(email, JSON.stringify(record));
}

export type FirstEligibility = 'eligible' | 'not_issued' | 'claimed' | 'pending' | 'unknown';

/**
 * Whether this email may start a first-class Checkout now. Stripe is the source
 * of truth for "has paid for a class"; the KV flag caches a "yes" (set here or by
 * the webhook). Callers must not tell the client which reason applied: every
 * value except 'eligible' answers the same way, so the endpoint cannot be used
 * to learn whether an address has bought a ticket.
 */
export async function firstClassEligibility(env: Env, email: string, secretKey: string, nowMs: number): Promise<FirstEligibility> {
	const record = await readSubscriber(env, email);
	if (!record?.first_offer_issued_at) return 'not_issued';
	if (record.first_discount_claimed) return 'claimed';
	if ((record.first_pending_until ?? 0) > nowMs) return 'pending';
	const purchased = await hasCompletedCiPurchase(secretKey, email);
	if (purchased === null) return 'unknown';
	if (purchased) {
		await writeSubscriber(env, email, { ...record, first_discount_claimed: true });
		return 'claimed';
	}
	return 'eligible';
}

export async function setFirstPending(env: Env, email: string, until: number | null): Promise<void> {
	const record = await readSubscriber(env, email);
	if (!record) return;
	// A webhook-confirmed claim always wins: never put a pending marker back on a
	// record the webhook has already closed.
	if (until !== null && record.first_discount_claimed) return;
	const { first_pending_until: _drop, ...rest } = record;
	await writeSubscriber(env, email, until === null ? rest : { ...rest, first_pending_until: until });
}

/**
 * Ambassador allowlist: AMBASSADORS KV, one key per /fr/<slug>. An unknown slug
 * still buys at $15 (the link worked for the buyer), but the sale is tagged
 * referrer_verified=false so the credit ledger can ignore it. No binding yet
 * (until Max creates the namespace) means every referrer reads as unverified.
 */
export async function isKnownAmbassador(env: Env, slug: string): Promise<boolean> {
	if (!env.AMBASSADORS) return false;
	return (await env.AMBASSADORS.get(`ambassador:${slug}`)) !== null;
}

interface FirstClassRequest {
	email?: string;
	consent?: boolean;
	company?: string; // honeypot
}

type CorsHeaders = Record<string, string>;

function json(body: unknown, status: number, corsHeaders: CorsHeaders): Response {
	return Response.json(body, { status, headers: corsHeaders });
}

/**
 * POST /api/first-class { email, consent }
 *
 * Records that the offer was issued to this address (merged into the existing
 * subscriber record, never overwriting what is there). Always answers
 * { ok: true } once the input is valid: whether the $15 price is still open is
 * decided at checkout, with one uniform refusal, so this endpoint reveals
 * nothing about past purchases.
 */
export async function handleFirstClass(
	request: Request,
	env: Env,
	corsHeaders: CorsHeaders,
	onStored?: (email: string) => Promise<void>,
): Promise<Response> {
	let body: FirstClassRequest;
	try {
		body = (await request.json()) as FirstClassRequest;
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, corsHeaders);
	}

	if (typeof body.company === 'string' && body.company.trim()) {
		return json({ ok: true }, 200, corsHeaders);
	}

	const email = normalizeEmail(body.email);
	if (!isValidEmail(email)) return json({ ok: false, error: 'Invalid email' }, 400, corsHeaders);
	if (!body.consent) return json({ ok: false, error: 'Consent required' }, 400, corsHeaders);

	const existing = (await readSubscriber(env, email)) ?? {};
	const record: SubscriberRecord = {
		email,
		consent: true,
		source: existing.source ?? 'miamicontactimprov-first-class',
		ts: Date.now(),
		...existing,
		first_offer_issued_at: existing.first_offer_issued_at ?? Date.now(),
		first_discount_claimed: existing.first_discount_claimed ?? false,
	};
	await writeSubscriber(env, email, record);
	if (onStored) await onStored(email).catch((error) => console.error('[First-class sync failed]', error));

	return json({ ok: true }, 200, corsHeaders);
}
