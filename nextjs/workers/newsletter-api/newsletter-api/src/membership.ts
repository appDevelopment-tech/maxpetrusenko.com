/**
 * Memberships: monthly $40 (4 class credits per billing month, unused roll over, 8 banked
 * at most) and yearly $260 (one class a week). Classes only, not jams or workshops.
 *
 * Routes (wired in index.ts):
 *   POST /api/membership/checkout   public   Stripe Checkout, mode=subscription
 *   GET  /api/membership/session    public   success page: confirms the session with Stripe
 *   POST /api/membership/portal     public   member id -> Stripe Customer Portal URL
 *   GET  /api/membership/members    admin    host's member list (paginated)
 *   POST /api/membership/checkin    admin    burns a credit for a class date (host stub)
 * Webhook events (stripe-webhook.ts calls handleMembershipEvent):
 *   checkout.session.completed and checkout.session.async_payment_succeeded (mode=subscription),
 *   invoice.paid, customer.subscription.updated, customer.subscription.deleted,
 *   charge.refunded, charge.dispute.created
 *
 * The Stripe account is shared with other products, so every handler first decides
 * whether the object is ours (metadata.product = ci-membership, a ci-member price, a
 * payment we recorded, or a member we already know) and ignores it otherwise.
 *
 * KV layout (binding TICKETS, same namespace as tickets). One writer family per key,
 * because KV has no compare-and-set:
 *   mem:<memberId>                    MemberProfile  checkout.completed, subscription.updated/deleted, charge events
 *   memcr:<memberId>                  CreditLedger   invoice.paid only (plan, period, replay guard)
 *   memcredit:<memberId>:<creditId>   Credit         invoice.paid only, written once, never modified
 *   memburn:<memberId>:<creditId>     class date     check-in only: the claim that spends a credit
 *   memci:<memberId>:<date>           creditId|weekly  one check-in per class date
 *   memwk:<memberId>:<isoWeek>        date           yearly: one class per ISO week
 *   mememail:<sha256(email)>          memberId       lookup by email
 *   mememailst:<memberId>             EmailState     welcome email sender only
 *   mempay:<charge or payment intent> memberId       so refunds and disputes find the member
 * memberId = HMAC-SHA256(TICKET_SECRET, 'ci-member:' + stripe customer id), 128 bits (the
 * default version "v1"; another CI_MEMBER_ID_VERSION salts the input). It is derivable from
 * the customer id alone and doubles as the unguessable key in the "manage" link.
 *
 * Spending a credit: the oldest credit with no memburn key is claimed by writing
 * memburn:<id>:<creditId> = date and reading it back; if the value is not our date another
 * check-in took it and we move to the next credit. KV is eventually consistent and has no
 * compare-and-set, so two check-ins for DIFFERENT dates landing within the same KV
 * propagation window (about a second) can still both read back their own value. The host
 * scans one member at a time at a door, so that window is accepted; it is not closed.
 */

import type { Env } from './index';
import { cleanName, isValidEmail, normalizeEmail, sha256Hex, text } from './common';
import { BF_CAMPAIGN, BF_FRIEND_PASSES, friendPassesFor, inBfWindow } from './bf';
import { EVENTS } from './schedule';
import { createPortalSession, createSubscriptionSession, fetchSession, findCustomerByEmail, findPriceByLookupKey, StripeUnavailableError } from './stripe';
import type { StripeSession } from './tickets';
import { sendMembershipEmail } from './membership-email';

export type Plan = 'monthly' | 'yearly';
export const PLANS: Plan[] = ['monthly', 'yearly'];
export const MEMBERSHIP_LOOKUP_KEYS: Record<Plan, string> = { monthly: 'ci-member-monthly-40', yearly: 'ci-member-yearly-260' };
// Live prices (account acct_1L2xjuGR8ZpP3Rho). Only used to recognise our own objects.
export const MEMBERSHIP_PRICE_IDS: Record<string, Plan> = {
	price_1Ue7AyGR8ZpP3RhohOxjhayc: 'monthly',
	price_1Ue7AyGR8ZpP3Rhovol4O08u: 'yearly',
};
export const MEMBERSHIP_PRODUCT = 'ci-membership';
export const MONTHLY_CREDITS = 4;
export const MAX_BANKED_CREDITS = 8;
export const MANAGE_BASE = 'https://miamicontactimprov.com/membership/manage?m=';
const SITE = 'https://miamicontactimprov.com';

export type MemberStatus = 'active' | 'suspended' | 'canceled';
export type SuspendReason = 'payment' | 'refund' | 'dispute';

export interface FriendPass { n: number; available_from: string; redeemed_at: string | null; redeemed_by: string | null }

export interface MemberProfile {
	id: string;
	email: string;
	name: string;
	phone: string;
	stripe_customer: string;
	stripe_subscription: string;
	plan: Plan;
	status: MemberStatus;
	suspended_reason: SuspendReason | null;
	suspended_at: string | null;
	created_at: string;
	canceled_at: string | null;
	bf: { campaign: string; purchased_at: string } | null;
	friend_passes: FriendPass[];
	utm: Record<string, string>;
	sessions: string[]; // checkout sessions applied, replay guard (last 10)
	extra_subscriptions: string[]; // a second paid subscription while one was active: refund by hand
}

export interface Credit { id: string; source_invoice: string; granted_at: string; used_at: string | null; used_for: string | null }

export interface CreditLedger {
	member_id: string;
	plan: Plan;
	invoices: string[]; // invoice ids already applied, replay guard
	period_start: string | null;
	period_end: string | null;
	updated_at: string;
}

export interface EmailState { sent_sessions: string[]; latest_session: string; sent_at: string | null; email_id: string | null; error: string | null }

function hex(bytes: ArrayBuffer): string {
	return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function memberIdFor(secret: string, customerId: string, version = 'v1'): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const input = version === 'v1' ? `ci-member:${customerId}` : `ci-member:${version}:${customerId}`;
	return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))).slice(0, 32);
}

const idFor = (env: Env, customerId: string) => memberIdFor(env.TICKET_SECRET as string, customerId, env.CI_MEMBER_ID_VERSION || 'v1');

export const isMemberId = (v: string) => /^[0-9a-f]{32}$/.test(v);
export const manageUrl = (memberId: string) => `${MANAGE_BASE}${memberId}`;
/** Logs never carry the member id (it is the manage-link secret): eight hex chars of its hash. */
export async function shortId(memberId: string): Promise<string> {
	return (await sha256Hex(memberId)).slice(0, 8);
}

async function readJson<T>(env: Env, key: string): Promise<T | null> {
	const raw = await env.TICKETS?.get(key);
	return raw ? (JSON.parse(raw) as T) : null;
}
export const getMember = (env: Env, id: string) => readJson<MemberProfile>(env, `mem:${id}`);
export const getLedger = (env: Env, id: string) => readJson<CreditLedger>(env, `memcr:${id}`);
export const getEmailState = (env: Env, id: string) => readJson<EmailState>(env, `mememailst:${id}`);

async function listNames(env: Env, prefix: string, maxPages = 20): Promise<string[]> {
	const out: string[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < maxPages; page++) {
		const res = await env.TICKETS!.list({ prefix, cursor });
		for (const k of res.keys) out.push(k.name.slice(prefix.length));
		if (res.list_complete !== false || !res.cursor) break;
		cursor = res.cursor;
	}
	return out;
}

/** Credit ids granted and credit ids spent, from key names alone (no value reads). */
async function creditNames(env: Env, memberId: string): Promise<{ all: string[]; burned: Set<string> }> {
	const [all, burned] = await Promise.all([listNames(env, `memcredit:${memberId}:`), listNames(env, `memburn:${memberId}:`)]);
	return { all, burned: new Set(burned) };
}

export async function listCredits(env: Env, memberId: string): Promise<Credit[]> {
	const { all } = await creditNames(env, memberId);
	const out: Credit[] = [];
	for (const id of all) {
		const credit = await readJson<Credit>(env, `memcredit:${memberId}:${id}`);
		if (!credit) continue;
		const used = await env.TICKETS!.get(`memburn:${memberId}:${id}`);
		out.push({ ...credit, used_at: used ? 'claimed' : null, used_for: used });
	}
	return out;
}

export async function creditsRemaining(env: Env, memberId: string): Promise<number> {
	const { all, burned } = await creditNames(env, memberId);
	return all.filter((id) => !burned.has(id)).length;
}

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
	// When the address is known, reuse its Stripe customer (one member per person, not one per
	// purchase) and refuse a second membership while one is running. Stripe Checkout collects
	// the address itself when it is not sent, so the webhook also flags a double (see
	// onCheckoutCompleted); this is the early, friendly half of the guard.
	let customer: string | undefined;
	if (email) {
		customer = (await findCustomerByEmail(env.STRIPE_SECRET_KEY, email)) ?? undefined;
		if (customer && env.TICKETS && env.TICKET_SECRET) {
			const existing = await getMember(env, await idFor(env, customer));
			if (existing && existing.status !== 'canceled') {
				return json({ ok: false, error: 'already_member', manage_url: manageUrl(existing.id) }, 409, cors);
			}
		}
	}
	const metadata: Record<string, string> = { product: MEMBERSHIP_PRODUCT, plan, bf_at_start: inBfWindow(new Date()) ? '1' : '0' };
	for (const f of UTM_FIELDS) {
		const v = text(body[f], 80);
		if (v) metadata[f] = v;
	}
	const session = await createSubscriptionSession(env.STRIPE_SECRET_KEY, {
		priceId: price.id,
		successUrl: `${SITE}/membership/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
		cancelUrl: `${SITE}/membership`,
		...(customer ? { customer } : { email }),
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
	if (!env.STRIPE_SECRET_KEY || !env.TICKET_SECRET || !env.TICKETS) return json({ ok: false, error: 'Memberships not configured' }, 500, cors);
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
	const memberId = await idFor(env, session.customer as string);
	// The offer is decided once, by the webhook, on payment time. The page reads the stored
	// decision. Before the webhook has written the profile `pending` is true and bf is not
	// claimed; the page retries.
	const member = await getMember(env, memberId);
	const bf = !!member?.bf;
	return json({ ok: true, paid: true, plan, bf, pending: !member, friend_passes: bf ? BF_FRIEND_PASSES : 0, manage_url: manageUrl(memberId) }, 200, cors);
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

export const MEMBERSHIP_EVENTS = [
	'checkout.session.completed',
	'checkout.session.async_payment_succeeded',
	'invoice.paid',
	'customer.subscription.updated',
	'customer.subscription.deleted',
	'charge.refunded',
	'charge.dispute.created',
];

export async function handleMembershipEvent(env: Env, event: StripeEvent): Promise<Response> {
	if (!env.TICKETS || !env.TICKET_SECRET) return Response.json({ ok: false, error: 'Memberships not configured' }, { status: 500 });
	const obj = event.data?.object;
	if (!obj) return Response.json({ ok: true, ignored: event.type ?? 'unknown' });
	try {
		switch (event.type) {
			case 'checkout.session.completed':
			case 'checkout.session.async_payment_succeeded':
				return await onCheckoutCompleted(env, event, obj as StripeSession);
			case 'invoice.paid':
				return await onInvoicePaid(env, obj);
			case 'customer.subscription.updated':
				return await onSubscriptionUpdated(env, obj);
			case 'customer.subscription.deleted':
				return await onSubscriptionDeleted(env, obj);
			case 'charge.refunded':
				return await onChargeProblem(env, 'refund', obj.refunded === true ? [obj.id, obj.payment_intent] : []);
			case 'charge.dispute.created':
				return await onChargeProblem(env, 'dispute', [obj.charge, obj.payment_intent]);
		}
	} catch (error) {
		// 500 makes Stripe retry; every step below is safe to repeat.
		console.error('[Membership webhook failed]', event.type, String(error));
		return Response.json({ ok: false, error: 'Processing failed' }, { status: 500 });
	}
	return Response.json({ ok: true, ignored: event.type ?? 'unknown' });
}

const putJson = (env: Env, key: string, value: unknown) => env.TICKETS!.put(key, JSON.stringify(value));

async function onCheckoutCompleted(env: Env, event: StripeEvent, session: StripeSession): Promise<Response> {
	if (session.metadata?.product !== MEMBERSHIP_PRODUCT) return Response.json({ ok: true, skipped: 'not a CI membership' });
	if (session.payment_status !== 'paid') return Response.json({ ok: true, skipped: 'not paid' });
	const customer = typeof session.customer === 'string' ? session.customer : '';
	const subscription = typeof session.subscription === 'string' ? session.subscription : '';
	if (!customer || !subscription) return Response.json({ ok: true, skipped: 'no customer or subscription' });
	const plan: Plan = session.metadata?.plan === 'yearly' ? 'yearly' : 'monthly';
	const id = await idFor(env, customer);
	// Bought at the moment Stripe confirmed payment (event.created), not when checkout was
	// opened, so a session started on Dec 1 at 11:59 PM and paid after midnight is out.
	const purchasedAt = new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000);
	const bf = inBfWindow(purchasedAt);

	let member = await getMember(env, id);
	let created = false;
	let doubled = false;
	if (!member) {
		const email = (session.customer_details?.email ?? '').trim().toLowerCase();
		const utm: Record<string, string> = {};
		for (const f of UTM_FIELDS) if (session.metadata?.[f]) utm[f] = session.metadata[f];
		member = {
			id, email, name: cleanName(session.customer_details?.name ?? ''), phone: (session.customer_details?.phone ?? '').trim().slice(0, 32),
			stripe_customer: customer, stripe_subscription: subscription, plan, status: 'active', suspended_reason: null, suspended_at: null,
			created_at: purchasedAt.toISOString(), canceled_at: null,
			bf: bf ? { campaign: BF_CAMPAIGN, purchased_at: purchasedAt.toISOString() } : null,
			friend_passes: bf ? friendPassesFor(purchasedAt) : [],
			utm, sessions: [session.id], extra_subscriptions: [],
		};
		const raced = await getMember(env, id);
		if (raced) member = raced;
		else {
			await putJson(env, `mem:${id}`, member);
			created = true;
		}
		if (email) await env.TICKETS!.put(`mememail:${await sha256Hex(normalizeEmail(email))}`, id);
	} else if (!member.sessions.includes(session.id)) {
		// A known customer buying again: a resubscription after cancel, or a second paid
		// subscription. Update status, subscription and plan instead of ignoring the purchase.
		const running = member.status !== 'canceled' && !!member.stripe_subscription && member.stripe_subscription !== subscription;
		const next: MemberProfile = { ...member, sessions: [...member.sessions, session.id].slice(-10) };
		if (running) {
			// Already a live membership: keep it and flag the extra subscription for a manual refund.
			doubled = true;
			next.extra_subscriptions = [...new Set([...member.extra_subscriptions, subscription])];
			console.error('[Membership double subscription]', await shortId(id));
		} else {
			next.stripe_subscription = subscription;
			next.plan = plan;
			next.status = 'active';
			next.canceled_at = null;
			next.suspended_reason = null;
			next.suspended_at = null;
			// Passes are earned once per person: a repeat buyer inside the window gets none.
			if (bf && !member.bf) {
				next.bf = { campaign: BF_CAMPAIGN, purchased_at: purchasedAt.toISOString() };
				next.friend_passes = friendPassesFor(purchasedAt);
			}
		}
		await putJson(env, `mem:${id}`, next);
		member = next;
	}
	const mail = await sendMembershipEmail(env, member, session.id);
	return Response.json({ ok: true, member_id: id, created, ...(doubled ? { double_subscription: true } : {}), email: mail });
}

function invoiceSubscriptionMetadata(inv: any): Record<string, string> {
	return inv.parent?.subscription_details?.metadata ?? inv.subscription_details?.metadata ?? {};
}

function planFromPrice(price: { id?: string; lookup_key?: string } | undefined, fallbackId?: string): Plan | null {
	if (price?.lookup_key === MEMBERSHIP_LOOKUP_KEYS.monthly) return 'monthly';
	if (price?.lookup_key === MEMBERSHIP_LOOKUP_KEYS.yearly) return 'yearly';
	return MEMBERSHIP_PRICE_IDS[price?.id ?? fallbackId ?? ''] ?? null;
}

function planFromInvoice(inv: any): Plan | null {
	const metaPlan = invoiceSubscriptionMetadata(inv).plan;
	if (metaPlan === 'monthly' || metaPlan === 'yearly') return metaPlan;
	for (const line of inv.lines?.data ?? []) {
		const p = planFromPrice(line.price, line.pricing?.price_details?.price);
		if (p) return p;
	}
	return null;
}

function paymentRefs(inv: any): string[] {
	const refs = new Set<string>();
	for (const v of [inv.charge, inv.payment_intent]) if (typeof v === 'string' && v) refs.add(v);
	for (const p of inv.payments?.data ?? []) {
		for (const v of [p.payment?.charge, p.payment?.payment_intent]) if (typeof v === 'string' && v) refs.add(v);
	}
	return [...refs];
}

async function onInvoicePaid(env: Env, inv: any): Promise<Response> {
	const customer = typeof inv.customer === 'string' ? inv.customer : '';
	const invoiceId = typeof inv.id === 'string' ? inv.id : '';
	if (!customer || !invoiceId) return Response.json({ ok: true, skipped: 'no customer or invoice id' });
	const id = await idFor(env, customer);
	const known = await getMember(env, id);
	const invoicePlan = planFromInvoice(inv);
	const plan = invoicePlan ?? known?.plan ?? null;
	const ours = invoiceSubscriptionMetadata(inv).product === MEMBERSHIP_PRODUCT || invoicePlan !== null || known !== null;
	if (!ours || !plan) return Response.json({ ok: true, skipped: 'not a CI membership invoice' });

	const ledger: CreditLedger = (await getLedger(env, id)) ?? { member_id: id, plan, invoices: [], period_start: null, period_end: null, updated_at: '' };
	if (ledger.invoices.includes(invoiceId)) return Response.json({ ok: true, member_id: id, duplicate: true });

	// Only a new subscription and a normal renewal that actually charged money carry a
	// month of credits; proration (subscription_update), manual and $0 invoices do not.
	const reason: string = inv.billing_reason ?? '';
	const grants = (reason === 'subscription_create' || reason === 'subscription_cycle') && typeof inv.amount_paid === 'number' && inv.amount_paid > 0;
	const now = new Date();
	let granted = 0;
	if (plan === 'monthly' && grants) {
		const { all, burned } = await creditNames(env, id);
		// Credits from this very invoice (a retry after a partial write) do not count against the cap.
		const unused = all.filter((c) => !burned.has(c) && !c.startsWith(`${invoiceId}.`)).length;
		granted = Math.max(0, Math.min(MONTHLY_CREDITS, MAX_BANKED_CREDITS - unused));
		for (let i = 1; i <= granted; i++) {
			const creditId = `${invoiceId}.${i}`;
			if (all.includes(creditId)) continue; // written by an earlier attempt: keep granted_at
			const credit: Credit = { id: creditId, source_invoice: invoiceId, granted_at: now.toISOString(), used_at: null, used_for: null };
			await putJson(env, `memcredit:${id}:${creditId}`, credit);
		}
	}
	for (const ref of paymentRefs(inv)) await env.TICKETS!.put(`mempay:${ref}`, id);

	const line = inv.lines?.data?.[0];
	const iso = (s: unknown) => (typeof s === 'number' ? new Date(s * 1000).toISOString() : null);
	ledger.plan = plan;
	ledger.invoices = [...ledger.invoices, invoiceId].slice(-24);
	if (line?.period) {
		ledger.period_start = iso(line.period.start) ?? ledger.period_start;
		ledger.period_end = iso(line.period.end) ?? ledger.period_end;
	}
	ledger.updated_at = now.toISOString();
	await putJson(env, `memcr:${id}`, ledger);
	return Response.json({ ok: true, member_id: id, granted });
}

async function onSubscriptionUpdated(env: Env, sub: any): Promise<Response> {
	const customer = typeof sub.customer === 'string' ? sub.customer : '';
	if (!customer) return Response.json({ ok: true, skipped: 'no customer' });
	const id = await idFor(env, customer);
	const member = await getMember(env, id);
	if (!member) return Response.json({ ok: true, skipped: 'not a known member' });
	// Only the subscription on the profile drives access. A newer one is adopted by its own
	// checkout.session.completed, an older one by nothing.
	if (sub.id && member.stripe_subscription !== sub.id) return Response.json({ ok: true, skipped: 'not the current subscription' });

	const next: MemberProfile = { ...member };
	const item = sub.items?.data?.[0];
	const plan = (sub.metadata?.plan === 'monthly' || sub.metadata?.plan === 'yearly' ? sub.metadata.plan : null) ?? planFromPrice(item?.price, item?.price?.id);
	if (plan) next.plan = plan;
	const status: string = sub.status ?? '';
	if (['past_due', 'unpaid', 'incomplete_expired'].includes(status)) {
		if (next.status === 'active') {
			next.status = 'suspended';
			next.suspended_reason = 'payment';
			next.suspended_at = new Date().toISOString();
		}
	} else if (status === 'active' || status === 'trialing') {
		// Payment recovered. A refund or dispute suspension is not undone by the card working again.
		if (next.status === 'suspended' && next.suspended_reason === 'payment') {
			next.status = 'active';
			next.suspended_reason = null;
			next.suspended_at = null;
		}
	} else if (status === 'canceled' && next.status !== 'canceled') {
		next.status = 'canceled';
		next.canceled_at = new Date().toISOString();
	}
	if (JSON.stringify(next) === JSON.stringify(member)) return Response.json({ ok: true, member_id: id, unchanged: true });
	await putJson(env, `mem:${id}`, next);
	return Response.json({ ok: true, member_id: id, status: next.status, plan: next.plan });
}

async function onSubscriptionDeleted(env: Env, sub: any): Promise<Response> {
	const customer = typeof sub.customer === 'string' ? sub.customer : '';
	if (!customer) return Response.json({ ok: true, skipped: 'no customer' });
	const id = await idFor(env, customer);
	const member = await getMember(env, id);
	if (!member) return Response.json({ ok: true, skipped: sub.metadata?.product === MEMBERSHIP_PRODUCT ? 'unknown member' : 'not a CI membership' });
	// A customer who cancelled and later re-subscribed has a newer subscription: only the
	// one on the profile ends the membership.
	if (member.stripe_subscription && sub.id && member.stripe_subscription !== sub.id) return Response.json({ ok: true, skipped: 'older subscription' });
	if (member.status === 'canceled') return Response.json({ ok: true, member_id: id, duplicate: true });
	await putJson(env, `mem:${id}`, { ...member, status: 'canceled', canceled_at: new Date().toISOString() });
	return Response.json({ ok: true, member_id: id, status: 'canceled' });
}

/** A full refund or a dispute on a membership payment suspends the member. Restoring is manual. */
async function onChargeProblem(env: Env, reason: 'refund' | 'dispute', refs: unknown[]): Promise<Response> {
	let id = '';
	for (const ref of refs) {
		if (typeof ref !== 'string' || !ref) continue;
		id = (await env.TICKETS!.get(`mempay:${ref}`)) ?? '';
		if (id) break;
	}
	if (!id) return Response.json({ ok: true, skipped: 'not a CI membership payment' });
	const member = await getMember(env, id);
	if (!member) return Response.json({ ok: true, skipped: 'unknown member' });
	if (member.status === 'suspended' && member.suspended_reason === reason) return Response.json({ ok: true, member_id: id, duplicate: true });
	if (member.status === 'canceled') return Response.json({ ok: true, member_id: id, skipped: 'already canceled' });
	await putJson(env, `mem:${id}`, { ...member, status: 'suspended', suspended_reason: reason, suspended_at: new Date().toISOString() });
	return Response.json({ ok: true, member_id: id, status: 'suspended', reason });
}

// ------------------------------------------------------------------ host endpoints

const MAX_PAGE = 50;

export async function handleMemberList(env: Env, url: URL, cors: Record<string, string>): Promise<Response> {
	if (!env.TICKETS) return json({ ok: false, error: 'Memberships not configured' }, 500, cors);
	const wantEmail = (url.searchParams.get('email') ?? '').trim().toLowerCase();
	const wantStatus = url.searchParams.get('status') ?? '';
	const limit = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));
	let ids: string[] = [];
	let nextCursor: string | null = null;
	if (wantEmail) {
		const id = await env.TICKETS.get(`mememail:${await sha256Hex(normalizeEmail(wantEmail))}`);
		if (id) ids = [id];
	} else {
		const res = await env.TICKETS.list({ prefix: 'mem:', cursor: url.searchParams.get('cursor') || undefined, limit } as any);
		ids = res.keys.map((k) => k.name.slice('mem:'.length));
		if (res.list_complete === false && res.cursor) nextCursor = res.cursor;
	}
	const members = [];
	for (const id of ids) {
		const m = await getMember(env, id);
		if (!m) continue;
		if (wantStatus && m.status !== wantStatus) continue;
		const ledger = await getLedger(env, id);
		const plan = ledger?.plan ?? m.plan;
		const { all, burned } = await creditNames(env, id);
		const email = await getEmailState(env, id);
		members.push({
			id: m.id, name: m.name, email: m.email, phone: m.phone, plan, status: m.status, suspended_reason: m.suspended_reason,
			created_at: m.created_at, canceled_at: m.canceled_at, period_end: ledger?.period_end ?? null,
			credits_remaining: plan === 'monthly' ? all.filter((c) => !burned.has(c)).length : null,
			credits_used: all.filter((c) => burned.has(c)).length,
			bf: m.bf, friend_passes_remaining: m.friend_passes.filter((p) => !p.redeemed_at).length, friend_passes: m.friend_passes,
			duplicate_subscriptions: m.extra_subscriptions,
			email_sent_at: email?.sent_at ?? null, email_error: email?.error ?? null,
		});
	}
	members.sort((a, b) => a.created_at.localeCompare(b.created_at));
	return json({ ok: true, count: members.length, members, next_cursor: nextCursor }, 200, cors);
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
	| { ok: false; error: 'unknown_member' | 'inactive' | 'expired' | 'unknown_date' | 'no_credits' | 'week_used' };

/**
 * Host check-in: uses one entitlement for a class date. Idempotent per (member, date).
 * Monthly claims the oldest unspent credit (see the header for the claim and its residual
 * window); yearly allows one class per ISO week and only inside the paid period.
 * Only an active member can check in: suspended (past due, refunded, disputed) and
 * canceled are refused.
 */
export async function burnCredit(env: Env, memberId: string, date: string, now = new Date()): Promise<BurnResult> {
	const member = await getMember(env, memberId);
	if (!member) return { ok: false, error: 'unknown_member' };
	if (member.status !== 'active') return { ok: false, error: 'inactive' };
	if (!EVENTS.some((e) => e.date === date)) return { ok: false, error: 'unknown_date' };
	const ciKey = `memci:${memberId}:${date}`;
	if (await env.TICKETS!.get(ciKey)) return { ok: true, already: true };
	const ledger = await getLedger(env, memberId);
	const plan = ledger?.plan ?? member.plan;

	if (plan === 'yearly') {
		if (!ledger?.period_end || new Date(ledger.period_end).getTime() <= now.getTime()) return { ok: false, error: 'expired' };
		const wkKey = `memwk:${memberId}:${isoWeek(date)}`;
		if (await env.TICKETS!.get(wkKey)) return { ok: false, error: 'week_used' };
		await env.TICKETS!.put(wkKey, date);
		if ((await env.TICKETS!.get(wkKey)) !== date) return { ok: false, error: 'week_used' };
		await env.TICKETS!.put(ciKey, 'weekly');
		return { ok: true };
	}

	const { all, burned } = await creditNames(env, memberId);
	const unusedIds = all.filter((c) => !burned.has(c));
	const credits: Credit[] = [];
	for (const cid of unusedIds) {
		const c = await readJson<Credit>(env, `memcredit:${memberId}:${cid}`);
		if (c) credits.push(c);
	}
	credits.sort((a, b) => a.granted_at.localeCompare(b.granted_at) || a.id.localeCompare(b.id));
	for (const credit of credits) {
		const burnKey = `memburn:${memberId}:${credit.id}`;
		if (await env.TICKETS!.get(burnKey)) continue; // taken since we listed
		await env.TICKETS!.put(burnKey, date);
		if ((await env.TICKETS!.get(burnKey)) !== date) continue; // another check-in claimed it first
		// A second scan for this same date racing us: only one of us keeps a credit.
		await env.TICKETS!.put(ciKey, credit.id);
		if ((await env.TICKETS!.get(ciKey)) !== credit.id) {
			await env.TICKETS!.delete(burnKey);
			return { ok: true, already: true };
		}
		return { ok: true, credit_id: credit.id, credits_remaining: credits.length - 1 };
	}
	return { ok: false, error: 'no_credits' };
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
