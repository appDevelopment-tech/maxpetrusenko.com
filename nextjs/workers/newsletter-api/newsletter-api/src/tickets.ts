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
interface SubscriberRecord {
	email?: string;
	consent?: boolean;
	source?: string;
	first_offer_issued_at?: number;
	first_discount_claimed?: boolean;
	[key: string]: unknown;
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

export async function markFirstClaimed(env: Env, email: string, record: SubscriberRecord): Promise<void> {
	await env.EMAIL_SUBS.put(email, JSON.stringify({ ...record, first_discount_claimed: true }));
}

export type FirstEligibility = 'eligible' | 'not_issued' | 'claimed' | 'unknown';

// Stripe is the source of truth for "has this person already paid for a class";
// the KV flag only caches a "yes" so a second check is free.
export async function firstClassEligibility(env: Env, email: string, secretKey: string): Promise<FirstEligibility> {
	const record = await readSubscriber(env, email);
	if (!record?.first_offer_issued_at) return 'not_issued';
	if (record.first_discount_claimed) return 'claimed';
	const purchased = await hasCompletedCiPurchase(secretKey, email);
	if (purchased === null) return 'unknown';
	if (purchased) {
		await markFirstClaimed(env, email, record);
		return 'claimed';
	}
	return 'eligible';
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
 * subscriber record, never overwriting what is there) and says whether the
 * $15 first class is still open to them. 200 either way once the email is
 * stored: eligible:false is an answer, not a failure.
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
		return json({ ok: true, eligible: false }, 200, corsHeaders);
	}

	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!isValidEmail(email)) return json({ ok: false, error: 'Invalid email' }, 400, corsHeaders);
	if (!body.consent) return json({ ok: false, error: 'Consent required' }, 400, corsHeaders);
	if (!env.STRIPE_SECRET_KEY) return json({ ok: false, error: 'Stripe not configured' }, 500, corsHeaders);

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
	await env.EMAIL_SUBS.put(email, JSON.stringify(record));
	if (onStored) await onStored(email).catch((error) => console.error('[First-class sync failed]', error));

	const eligibility = await firstClassEligibility(env, email, env.STRIPE_SECRET_KEY);
	if (eligibility === 'unknown') {
		return json({ ok: false, error: 'Could not check your first-class price, try again' }, 502, corsHeaders);
	}
	return json(
		eligibility === 'eligible' ? { ok: true, eligible: true } : { ok: true, eligible: false, reason: 'first_discount_claimed' },
		200,
		corsHeaders,
	);
}
