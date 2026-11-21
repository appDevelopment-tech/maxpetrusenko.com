/**
 * Memberships: monthly $40 (4 class credits per billing month, unused roll over, 8 banked at most) and yearly $260 (one class a week). Classes only, not jams or workshops.
 *
 * Routes (wired in index.ts):
 *   POST /api/membership/checkout   public   Stripe Checkout, mode=subscription
 *   GET  /api/membership/session    public   success page: confirms the session with Stripe
 *   POST /api/membership/portal     public   member id -> Stripe Customer Portal URL
 *   GET  /api/membership/members    admin    host's member list
 *   POST /api/membership/checkin    admin    burns a credit for a class date (host stub)
 * Webhook events (stripe-webhook.ts calls handleMembershipEvent):
 *   checkout.session.completed (mode=subscription), invoice.paid, customer.subscription.deleted
 *
 * The Stripe account is shared with other products, so every handler first decides
 * whether the object is ours (metadata.product = ci-membership, a ci-member price, or a
 * member we already know) and ignores it otherwise.
 *
 * KV layout (binding TICKETS, same namespace as tickets):
 *   mem:<memberId>              -> MemberProfile   written by checkout.completed / subscription.deleted
 *   memcr:<memberId>            -> CreditLedger    written by invoice.paid / the check-in burn
 *   mememail:<sha256(email)>    -> memberId        lookup by email
 *   memci:<memberId>:<date>     -> creditId|'weekly'  one check-in per class date (idempotent)
 *   memwk:<memberId>:<isoWeek>  -> date            yearly: one class per ISO week
 * memberId = HMAC-SHA256(TICKET_SECRET, 'ci-member:' + stripe customer id), 128 bits: it is
 * derivable from the customer id alone, so the profile and the ledger never need a lookup
 * to find each other, and it doubles as the unguessable key in the "manage" link.
 * Profile and ledger are separate keys on purpose: KV has no compare-and-set, and
 * checkout.session.completed and invoice.paid arrive at the same moment, so each key has
 * one writer family and the handlers cannot overwrite each other's fields.
 */

import type { Env } from './index';
import { cleanName, isValidEmail, normalizeEmail, sha256Hex, text } from './common';
import { BF_CAMPAIGN, BF_FRIEND_PASSES, friendPassesFor, inBfWindow } from './bf';
import { EVENTS } from './schedule';
import { createPortalSession, createSubscriptionSession, fetchSession, findPriceByLookupKey, StripeUnavailableError } from './stripe';
import type { StripeSession } from './tickets';
import { sendMembershipEmail } from './membership-email';

export type Plan = 'monthly' | 'yearly';
export const PLANS: Plan[] = ['monthly', 'yearly'];
export const MEMBERSHIP_LOOKUP_KEYS: Record<Plan, string> = { monthly: 'ci-member-monthly-40', yearly: 'ci-member-yearly-260' };
// Live prices (account acct_1L2xjuGR8ZpP3Rho). Only used to recognise our own invoices.
export const MEMBERSHIP_PRICE_IDS: Record<string, Plan> = {
	price_1Ue7AyGR8ZpP3RhohOxjhayc: 'monthly',
	price_1Ue7AyGR8ZpP3Rhovol4O08u: 'yearly',
};
export const MEMBERSHIP_PRODUCT = 'ci-membership';
export const MONTHLY_CREDITS = 4;
export const MAX_BANKED_CREDITS = 8;
export const MANAGE_BASE = 'https://miamicontactimprov.com/membership/manage?m=';
const SITE = 'https://miamicontactimprov.com';

export interface FriendPass { n: number; available_from: string; redeemed_at: string | null; redeemed_by: string | null }

export interface MemberProfile {
	id: string;
	email: string;
	name: string;
	phone: string;
	stripe_customer: string;
	stripe_subscription: string;
	plan: Plan;
	status: 'active' | 'canceled';
	created_at: string;
	canceled_at: string | null;
	bf: { campaign: string; purchased_at: string } | null;
	friend_passes: FriendPass[];
	utm: Record<string, string>;
	email_sent_at: string | null;
	email_id: string | null;
	email_error: string | null;
}

export interface Credit { id: string; source_invoice: string; granted_at: string; used_at: string | null; used_for: string | null }

export interface CreditLedger {
	member_id: string;
	plan: Plan;
	credits: Credit[]; // monthly only
	invoices: string[]; // invoice ids already applied, replay guard
	period_start: string | null;
	period_end: string | null;
	updated_at: string;
}

function hex(bytes: ArrayBuffer): string {
	return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function memberIdFor(secret: string, customerId: string): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`ci-member:${customerId}`))).slice(0, 32);
}

export const isMemberId = (v: string) => /^[0-9a-f]{32}$/.test(v);
export const manageUrl = (memberId: string) => `${MANAGE_BASE}${memberId}`;

async function readJson<T>(env: Env, key: string): Promise<T | null> {
	const raw = await env.TICKETS?.get(key);
	return raw ? (JSON.parse(raw) as T) : null;
}
export const getMember = (env: Env, id: string) => readJson<MemberProfile>(env, `mem:${id}`);
export const getLedger = (env: Env, id: string) => readJson<CreditLedger>(env, `memcr:${id}`);

function json(body: unknown, status: number, cors: Record<string, string>): Response {
	return Response.json(body, { status, headers: cors });
}

// ------------------------------------------------------------------ checkout

const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export async function handleMembershipCheckout(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
	}
	const plan = body.plan;
	if (typeof plan !== 'string' || !(PLANS as string[]).includes(plan)) return json({ ok: false, error: 'Unknown plan' }, 400, cors);
	if (!env.STRIPE_SECRET_KEY) return json({ ok: false, error: 'Stripe not configured' }, 500, cors);

	const price = await findPriceByLookupKey(env.STRIPE_SECRET_KEY, MEMBERSHIP_LOOKUP_KEYS[plan as Plan]);
	if (!price) return json({ ok: false, error: 'Price not configured' }, 500, cors);

	const email = typeof body.email === 'string' && isValidEmail(body.email) ? body.email.trim().toLowerCase() : undefined;
	const metadata: Record<string, string> = { product: MEMBERSHIP_PRODUCT, plan, bf_at_start: inBfWindow(new Date()) ? '1' : '0' };
	for (const f of UTM_FIELDS) {
		const v = text(body[f], 80);
		if (v) metadata[f] = v;
	}
	const session = await createSubscriptionSession(env.STRIPE_SECRET_KEY, {
		priceId: price.id,
		successUrl: `${SITE}/membership/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
		cancelUrl: `${SITE}/membership`,
		email,
		metadata,
	});
	if ('error' in session) return json({ ok: false, error: session.error }, 502, cors);
	return json({ url: session.url }, 200, cors);
}

// ------------------------------------------------------------------ session lookup

function isOurSubscriptionSession(s: StripeSession): boolean {
	return s.mode === 'subscription' && s.metadata?.product === MEMBERSHIP_PRODUCT && typeof s.customer === 'string' && s.customer.length > 0;
}

export async function handleMembershipSession(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
	const sessionId = new URL(request.url).searchParams.get('session_id') ?? '';
	if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return json({ ok: false, error: 'Invalid session_id' }, 400, cors);
	if (!env.STRIPE_SECRET_KEY || !env.TICKET_SECRET) return json({ ok: false, error: 'Memberships not configured' }, 500, cors);
	let session: StripeSession | null;
	try {
		session = await fetchSession(env.STRIPE_SECRET_KEY, sessionId);
	} catch (error) {
		if (!(error instanceof StripeUnavailableError)) throw error;
		return json({ ok: false, error: 'Stripe unavailable' }, 502, cors);
	}
	if (!session) return json({ ok: false, error: 'Unknown session' }, 404, cors);
	if (!isOurSubscriptionSession(session)) return json({ ok: false, error: 'Not a membership session' }, 422, cors);
	if (session.payment_status !== 'paid') return json({ ok: false, paid: false }, 402, cors);
	const plan = session.metadata?.plan === 'yearly' ? 'yearly' : 'monthly';
	const memberId = await memberIdFor(env.TICKET_SECRET, session.customer as string);
	const bf = session.metadata?.bf_at_start === '1' && typeof session.created === 'number' && inBfWindow(new Date(session.created * 1000));
	return json({ ok: true, paid: true, plan, bf, friend_passes: bf ? BF_FRIEND_PASSES : 0, manage_url: manageUrl(memberId) }, 200, cors);
}

// ------------------------------------------------------------------ portal

export async function handleMembershipPortal(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
	let body: { member_id?: unknown };
	try {
		body = (await request.json()) as { member_id?: unknown };
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
	}
	const id = typeof body.member_id === 'string' ? body.member_id : '';
	if (!isMemberId(id)) return json({ ok: false, error: 'Invalid member id' }, 400, cors);
	if (!env.STRIPE_SECRET_KEY || !env.TICKETS) return json({ ok: false, error: 'Memberships not configured' }, 500, cors);
	const member = await getMember(env, id);
	if (!member) return json({ ok: false, error: 'Unknown member' }, 404, cors);
	const portal = await createPortalSession(env.STRIPE_SECRET_KEY, { customer: member.stripe_customer, returnUrl: `${SITE}/membership`, configuration: env.CI_PORTAL_CONFIG_ID });
	if ('error' in portal) return json({ ok: false, error: portal.error }, 502, cors);
	return json({ url: portal.url }, 200, cors);
}

// ------------------------------------------------------------------ webhook

interface StripeEvent { id?: string; type?: string; created?: number; data?: { object?: any } }

export const MEMBERSHIP_EVENTS = ['checkout.session.completed', 'invoice.paid', 'customer.subscription.deleted'];

export async function handleMembershipEvent(env: Env, event: StripeEvent): Promise<Response> {
	if (!env.TICKETS || !env.TICKET_SECRET) return Response.json({ ok: false, error: 'Memberships not configured' }, { status: 500 });
	const obj = event.data?.object;
	if (!obj) return Response.json({ ok: true, ignored: event.type ?? 'unknown' });
	try {
		if (event.type === 'checkout.session.completed') return await onCheckoutCompleted(env, event, obj as StripeSession);
		if (event.type === 'invoice.paid') return await onInvoicePaid(env, obj);
		if (event.type === 'customer.subscription.deleted') return await onSubscriptionDeleted(env, obj);
	} catch (error) {
		// 500 makes Stripe retry; every step below is safe to repeat.
		console.error('[Membership webhook failed]', event.type, String(error));
		return Response.json({ ok: false, error: 'Processing failed' }, { status: 500 });
	}
	return Response.json({ ok: true, ignored: event.type ?? 'unknown' });
}

async function onCheckoutCompleted(env: Env, event: StripeEvent, session: StripeSession): Promise<Response> {
	if (session.metadata?.product !== MEMBERSHIP_PRODUCT) return Response.json({ ok: true, skipped: 'not a CI membership' });
	if (session.payment_status !== 'paid') return Response.json({ ok: true, skipped: 'not paid' });
	const customer = typeof session.customer === 'string' ? session.customer : '';
	const subscription = typeof session.subscription === 'string' ? session.subscription : '';
	if (!customer || !subscription) return Response.json({ ok: true, skipped: 'no customer or subscription' });
	const plan: Plan = session.metadata?.plan === 'yearly' ? 'yearly' : 'monthly';
	const id = await memberIdFor(env.TICKET_SECRET as string, customer);

	let member = await getMember(env, id);
	let created = false;
	if (!member) {
		// Bought at the moment Stripe confirmed payment (event.created), not when checkout
		// was opened, so a session started on Dec 1 at 11:59 PM and paid after midnight is out.
		const purchasedAt = new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000);
		const bf = inBfWindow(purchasedAt);
		const email = (session.customer_details?.email ?? '').trim().toLowerCase();
		const utm: Record<string, string> = {};
		for (const f of UTM_FIELDS) if (session.metadata?.[f]) utm[f] = session.metadata[f];
		member = {
			id, email, name: cleanName(session.customer_details?.name ?? ''), phone: (session.customer_details?.phone ?? '').trim().slice(0, 32),
			stripe_customer: customer, stripe_subscription: subscription, plan, status: 'active',
			created_at: purchasedAt.toISOString(), canceled_at: null,
			bf: bf ? { campaign: BF_CAMPAIGN, purchased_at: purchasedAt.toISOString() } : null,
			friend_passes: bf ? friendPassesFor(purchasedAt) : [],
			utm, email_sent_at: null, email_id: null, email_error: null,
		};
		const raced = await getMember(env, id);
		if (raced) member = raced;
		else {
			await env.TICKETS!.put(`mem:${id}`, JSON.stringify(member));
			created = true;
		}
		if (email) await env.TICKETS!.put(`mememail:${await sha256Hex(normalizeEmail(email))}`, id);
	}
	const mail = await sendMembershipEmail(env, member);
	return Response.json({ ok: true, member_id: id, created, email: mail });
}

function invoiceSubscriptionMetadata(inv: any): Record<string, string> {
	return inv.parent?.subscription_details?.metadata ?? inv.subscription_details?.metadata ?? {};
}

function planFromInvoice(inv: any): Plan | null {
	const metaPlan = invoiceSubscriptionMetadata(inv).plan;
	if (metaPlan === 'monthly' || metaPlan === 'yearly') return metaPlan;
	for (const line of inv.lines?.data ?? []) {
		const lk: string = line.price?.lookup_key ?? '';
		if (lk === MEMBERSHIP_LOOKUP_KEYS.monthly) return 'monthly';
		if (lk === MEMBERSHIP_LOOKUP_KEYS.yearly) return 'yearly';
		const pid: string = line.price?.id ?? line.pricing?.price_details?.price ?? '';
		if (MEMBERSHIP_PRICE_IDS[pid]) return MEMBERSHIP_PRICE_IDS[pid];
	}
	return null;
}

async function onInvoicePaid(env: Env, inv: any): Promise<Response> {
	const customer = typeof inv.customer === 'string' ? inv.customer : '';
	const invoiceId = typeof inv.id === 'string' ? inv.id : '';
	if (!customer || !invoiceId) return Response.json({ ok: true, skipped: 'no customer or invoice id' });
	const id = await memberIdFor(env.TICKET_SECRET as string, customer);
	const known = await getMember(env, id);
	const plan = planFromInvoice(inv) ?? known?.plan ?? null;
	const ours = invoiceSubscriptionMetadata(inv).product === MEMBERSHIP_PRODUCT || planFromInvoice(inv) !== null || known !== null;
	if (!ours || !plan) return Response.json({ ok: true, skipped: 'not a CI membership invoice' });
	// Only a new subscription and a normal renewal carry a month of credits; proration
	// invoices (billing_reason subscription_update) and manual ones do not.
	const reason: string = inv.billing_reason ?? '';
	const grants = reason === 'subscription_create' || reason === 'subscription_cycle';

	const ledger: CreditLedger = (await getLedger(env, id)) ?? { member_id: id, plan, credits: [], invoices: [], period_start: null, period_end: null, updated_at: '' };
	if (ledger.invoices.includes(invoiceId)) return Response.json({ ok: true, member_id: id, duplicate: true });

	const line = inv.lines?.data?.[0];
	const iso = (s: unknown) => (typeof s === 'number' ? new Date(s * 1000).toISOString() : null);
	const now = new Date();
	let granted = 0;
	if (plan === 'monthly' && grants) {
		const unused = ledger.credits.filter((c) => !c.used_at).length;
		granted = Math.max(0, Math.min(MONTHLY_CREDITS, MAX_BANKED_CREDITS - unused));
		for (let i = 0; i < granted; i++) {
			ledger.credits.push({ id: `${invoiceId}:${i + 1}`, source_invoice: invoiceId, granted_at: now.toISOString(), used_at: null, used_for: null });
		}
	}
	ledger.plan = plan;
	ledger.invoices = [...ledger.invoices, invoiceId].slice(-24);
	if (line?.period) {
		ledger.period_start = iso(line.period.start) ?? ledger.period_start;
		ledger.period_end = iso(line.period.end) ?? ledger.period_end;
	}
	ledger.updated_at = now.toISOString();
	await env.TICKETS!.put(`memcr:${id}`, JSON.stringify(ledger));
	return Response.json({ ok: true, member_id: id, granted });
}

async function onSubscriptionDeleted(env: Env, sub: any): Promise<Response> {
	const customer = typeof sub.customer === 'string' ? sub.customer : '';
	if (!customer) return Response.json({ ok: true, skipped: 'no customer' });
	const id = await memberIdFor(env.TICKET_SECRET as string, customer);
	const member = await getMember(env, id);
	if (!member) return Response.json({ ok: true, skipped: sub.metadata?.product === MEMBERSHIP_PRODUCT ? 'unknown member' : 'not a CI membership' });
	// A customer who cancelled and later re-subscribed has a newer subscription: only the
	// one on the profile ends the membership.
	if (member.stripe_subscription && sub.id && member.stripe_subscription !== sub.id) return Response.json({ ok: true, skipped: 'older subscription' });
	if (member.status === 'canceled') return Response.json({ ok: true, member_id: id, duplicate: true });
	await env.TICKETS!.put(`mem:${id}`, JSON.stringify({ ...member, status: 'canceled', canceled_at: new Date().toISOString() }));
	return Response.json({ ok: true, member_id: id, status: 'canceled' });
}

// ------------------------------------------------------------------ host endpoints

export function creditsRemaining(ledger: CreditLedger | null): number {
	return ledger ? ledger.credits.filter((c) => !c.used_at).length : 0;
}

export async function handleMemberList(env: Env, url: URL, cors: Record<string, string>): Promise<Response> {
	if (!env.TICKETS) return json({ ok: false, error: 'Memberships not configured' }, 500, cors);
	const wantEmail = (url.searchParams.get('email') ?? '').trim().toLowerCase();
	const wantStatus = url.searchParams.get('status') ?? '';
	const ids: string[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < 10; page++) {
		const res = await env.TICKETS.list({ prefix: 'mem:', cursor });
		for (const k of res.keys) ids.push(k.name.slice('mem:'.length));
		if (res.list_complete !== false || !res.cursor) break;
		cursor = res.cursor;
	}
	const members = [];
	for (const id of ids) {
		const m = await getMember(env, id);
		if (!m) continue;
		if (wantEmail && normalizeEmail(m.email) !== normalizeEmail(wantEmail)) continue;
		if (wantStatus && m.status !== wantStatus) continue;
		const ledger = await getLedger(env, id);
		members.push({
			id: m.id, name: m.name, email: m.email, phone: m.phone, plan: ledger?.plan ?? m.plan, status: m.status,
			created_at: m.created_at, canceled_at: m.canceled_at, period_end: ledger?.period_end ?? null,
			credits_remaining: m.plan === 'monthly' ? creditsRemaining(ledger) : null,
			credits_used: ledger ? ledger.credits.filter((c) => c.used_at).length : 0,
			bf: m.bf, friend_passes_remaining: m.friend_passes.filter((p) => !p.redeemed_at).length, friend_passes: m.friend_passes,
			manage_url: manageUrl(m.id), email_sent_at: m.email_sent_at, email_error: m.email_error,
		});
	}
	members.sort((a, b) => a.created_at.localeCompare(b.created_at));
	return json({ ok: true, count: members.length, members }, 200, cors);
}

function isoWeek(date: string): string {
	const d = new Date(`${date}T12:00:00Z`);
	const day = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - day);
	const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
	const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
	return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export type BurnResult =
	| { ok: true; already?: boolean; credits_remaining?: number; credit_id?: string }
	| { ok: false; error: 'unknown_member' | 'inactive' | 'unknown_date' | 'no_credits' | 'week_used' };

/**
 * Host check-in: uses one entitlement for a class date. Idempotent per (member, date).
 * Monthly burns the oldest unused credit; yearly allows one class per ISO week.
 * This is the scanner's entry point once /checkin exists.
 */
export async function burnCredit(env: Env, memberId: string, date: string): Promise<BurnResult> {
	const member = await getMember(env, memberId);
	if (!member) return { ok: false, error: 'unknown_member' };
	if (member.status !== 'active') return { ok: false, error: 'inactive' };
	if (!EVENTS.some((e) => e.date === date)) return { ok: false, error: 'unknown_date' };
	const ciKey = `memci:${memberId}:${date}`;
	if (await env.TICKETS!.get(ciKey)) return { ok: true, already: true };
	if (member.plan === 'yearly') {
		const wkKey = `memwk:${memberId}:${isoWeek(date)}`;
		if (await env.TICKETS!.get(wkKey)) return { ok: false, error: 'week_used' };
		await env.TICKETS!.put(wkKey, date);
		await env.TICKETS!.put(ciKey, 'weekly');
		return { ok: true };
	}
	const ledger = await getLedger(env, memberId);
	const credit = ledger?.credits.filter((c) => !c.used_at).sort((a, b) => a.granted_at.localeCompare(b.granted_at) || a.id.localeCompare(b.id))[0];
	if (!ledger || !credit) return { ok: false, error: 'no_credits' };
	credit.used_at = new Date().toISOString();
	credit.used_for = date;
	await env.TICKETS!.put(`memcr:${memberId}`, JSON.stringify(ledger));
	await env.TICKETS!.put(ciKey, credit.id);
	return { ok: true, credit_id: credit.id, credits_remaining: creditsRemaining(ledger) };
}

export async function handleMemberCheckin(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
	let body: { member_id?: unknown; email?: unknown; date?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
	}
	if (!env.TICKETS) return json({ ok: false, error: 'Memberships not configured' }, 500, cors);
	let id = typeof body.member_id === 'string' ? body.member_id : '';
	if (!id && typeof body.email === 'string' && isValidEmail(body.email)) {
		id = (await env.TICKETS.get(`mememail:${await sha256Hex(normalizeEmail(body.email))}`)) ?? '';
	}
	const date = typeof body.date === 'string' ? body.date : '';
	if (!isMemberId(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: 'member_id (or email) and date are required' }, 400, cors);
	const result = await burnCredit(env, id, date);
	return json(result, result.ok ? 200 : result.error === 'unknown_member' ? 404 : 409, cors);
}
