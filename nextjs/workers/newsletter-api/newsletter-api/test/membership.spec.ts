import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';
import { burnCredit, creditsRemaining, getEmailState, getLedger, getMember, listCredits, memberIdFor, shortId, MEMBERSHIP_PRICE_IDS } from '../src/membership';
import { listTicketsForBf } from '../src/tickets';
import { buildMembershipEmail } from '../src/membership-email';

const WHSEC = 'whsec_test_secret';
const TICKET_SECRET = 'ticket_secret_test';
const STRIPE = 'https://api.stripe.com';
const RESEND = 'https://api.resend.com';
const CUS = 'cus_TEST1';
const SUB = 'sub_TEST1';
const SESSION_ID = 'cs_test_m1B2c3D4e5F6g7H8i9';

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, {
		STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 're_test', STRIPE_WEBHOOK_SECRET: WHSEC, TICKET_SECRET, ADMIN_TOKEN: 'admin_test',
		CI_PORTAL_CONFIG_ID: 'bpc_test',
	}, overrides) as unknown as Env;
}

async function sign(body: string, secret = WHSEC, t = Math.floor(Date.now() / 1000)): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
	return `t=${t},v1=${Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function call(path: string, init: RequestInit = {}, e: Env = testEnv()) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request(`https://newsletter.test${path}`, init), e, ctx);
	await waitOnExecutionContext(ctx);
	const text = await res.text();
	return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function webhook(event: unknown, e: Env = testEnv()) {
	const body = JSON.stringify(event);
	return call('/api/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': await sign(body) }, body }, e);
}

const admin = { Authorization: 'Bearer admin_test' };
const post = (path: string, payload: unknown, headers: Record<string, string> = {}, e?: Env) =>
	call(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) }, e);

const emails: any[] = [];
const emailHeaders: Array<Record<string, string>> = [];
function interceptEmail(times = 1, status = 200) {
	fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails' }).reply(status, (o: any) => {
		emails.push(JSON.parse(String(o.body)));
		emailHeaders.push(o.headers as Record<string, string>);
		return status === 200 ? { id: 'em_1' } : { message: 'bad' };
	}).times(times);
}

const sessions: URLSearchParams[] = [];
function interceptPrice(lookup: string, id: string) {
	fetchMock.get(STRIPE).intercept({ method: 'GET', path: (p: string) => p.startsWith('/v1/prices?') && p.includes(encodeURIComponent(lookup)) })
		.reply(200, { data: [{ id, unit_amount: 4000 }] });
}
function interceptCustomer(id: string | null) {
	fetchMock.get(STRIPE).intercept({ method: 'GET', path: /\/v1\/customers\?/ }).reply(200, { data: id ? [{ id }] : [] });
}
function interceptSubSession() {
	fetchMock.get(STRIPE).intercept({ method: 'POST', path: '/v1/checkout/sessions' }).reply(200, (o: any) => {
		sessions.push(new URLSearchParams(String(o.body)));
		return { url: 'https://checkout.stripe.com/c/pay/sub_1' };
	});
}

const t = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

function subSession(overrides: Record<string, unknown> = {}) {
	return {
		id: SESSION_ID, mode: 'subscription', payment_status: 'paid', customer: CUS, subscription: SUB, created: t('2026-11-26T10:00:00-05:00'),
		customer_details: { name: 'Ana  Lopez', email: 'Ana@Example.com', phone: '+13055550100' },
		metadata: { product: 'ci-membership', plan: 'monthly', bf_at_start: '0', utm_source: 'ig', utm_campaign: 'bf-2026' },
		...overrides,
	};
}
const completed = (s: unknown = subSession(), at = '2026-11-20T10:00:00-05:00') => ({ id: 'evt_c', type: 'checkout.session.completed', created: t(at), data: { object: s } });

let invoiceN = 0;
function periodLines(start: string, end: string) {
	return { data: [{ period: { start: t(start), end: t(end) }, price: { id: 'price_1Ue7AyGR8ZpP3RhohOxjhayc', lookup_key: 'ci-member-monthly-40' } }] };
}
function invoice(overrides: Record<string, unknown> = {}) {
	invoiceN += 1;
	return {
		id: `in_TEST${invoiceN}`, customer: CUS, billing_reason: 'subscription_cycle', amount_paid: 4000,
		parent: { subscription_details: { subscription: SUB, metadata: { product: 'ci-membership', plan: 'monthly' } } },
		lines: { data: [{ period: { start: t('2026-12-01T00:00:00Z'), end: t('2027-01-01T00:00:00Z') }, price: { id: 'price_1Ue7AyGR8ZpP3RhohOxjhayc', lookup_key: 'ci-member-monthly-40' } }] },
		...overrides,
	};
}
const paid = (inv: unknown) => ({ id: 'evt_i', type: 'invoice.paid', created: 1, data: { object: inv } });

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
afterEach(() => {
	emails.length = 0;
	emailHeaders.length = 0;
	sessions.length = 0;
	fetchMock.assertNoPendingInterceptors();
	vi.useRealTimers();
});

async function memberId() {
	return memberIdFor(TICKET_SECRET, CUS);
}

describe('POST /api/membership/checkout', () => {
	it('rejects an unknown plan and bad JSON', async () => {
		expect((await post('/api/membership/checkout', { plan: 'weekly' })).status).toBe(400);
		const bad = await call('/api/membership/checkout', { method: 'POST', body: '{' });
		expect(bad.status).toBe(400);
	});

	it('creates a subscription session on the monthly lookup key with no promo codes, UTMs and subscription metadata', async () => {
		interceptPrice('ci-member-monthly-40', 'price_m');
		interceptCustomer(null);
		interceptSubSession();
		const { status, body } = await post('/api/membership/checkout', { plan: 'monthly', email: 'A@B.com', utm_source: 'email', utm_campaign: 'bf-2026', utm_medium: 'resend', junk: 'x' });
		expect(status).toBe(200);
		expect(body.url).toBe('https://checkout.stripe.com/c/pay/sub_1');
		const p = sessions[0];
		expect(p.get('mode')).toBe('subscription');
		expect(p.get('line_items[0][price]')).toBe('price_m');
		expect(p.has('allow_promotion_codes')).toBe(false);
		expect(p.get('customer_email')).toBe('a@b.com');
		expect(p.get('metadata[product]')).toBe('ci-membership');
		expect(p.get('metadata[plan]')).toBe('monthly');
		expect(p.get('metadata[utm_source]')).toBe('email');
		expect(p.get('metadata[utm_campaign]')).toBe('bf-2026');
		expect(p.get('metadata[utm_medium]')).toBe('resend');
		expect(p.has('metadata[junk]')).toBe(false);
		expect(p.get('subscription_data[metadata][product]')).toBe('ci-membership');
		expect(p.get('subscription_data[metadata][plan]')).toBe('monthly');
		expect(p.get('success_url')).toContain('/membership/success?plan=monthly&session_id={CHECKOUT_SESSION_ID}');
	});

	it('uses the yearly key and flags a session opened inside the BF window', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-28T12:00:00-05:00'));
		interceptPrice('ci-member-yearly-260', 'price_y');
		interceptSubSession();
		await post('/api/membership/checkout', { plan: 'yearly' });
		expect(sessions[0].get('line_items[0][price]')).toBe('price_y');
		expect(sessions[0].get('metadata[bf_at_start]')).toBe('1');
		expect(sessions[0].has('customer_email')).toBe(false);
	});

	it('answers 500 for a missing price and 502 when Stripe refuses', async () => {
		fetchMock.get(STRIPE).intercept({ method: 'GET', path: /\/v1\/prices\?/ }).reply(200, { data: [] });
		expect((await post('/api/membership/checkout', { plan: 'monthly' })).status).toBe(500);
		interceptPrice('ci-member-monthly-40', 'price_m');
		fetchMock.get(STRIPE).intercept({ method: 'POST', path: '/v1/checkout/sessions' }).reply(400, { error: { message: 'nope' } });
		expect((await post('/api/membership/checkout', { plan: 'monthly' })).status).toBe(502);
	});
});

describe('checkout.session.completed (mode=subscription)', () => {
	it('creates the member, indexes the email, sends one welcome with the manage link, and is safe to replay', async () => {
		interceptEmail(1);
		const first = await webhook(completed());
		expect(first.status).toBe(200);
		expect(first.body).toMatchObject({ ok: true, created: true, email: 'sent' });
		const id = await memberId();
		const m = (await getMember(testEnv(), id))!;
		expect(m).toMatchObject({ email: 'ana@example.com', name: 'Ana Lopez', plan: 'monthly', status: 'active', bf: null, stripe_customer: CUS, stripe_subscription: SUB });
		expect(m.friend_passes).toEqual([]);
		expect(m.utm).toEqual({ utm_source: 'ig', utm_campaign: 'bf-2026' });
		expect((await getEmailState(testEnv(), id))!.sent_sessions).toEqual([SESSION_ID]);
		expect(m.sessions).toEqual([SESSION_ID]);
		expect(emails[0].to).toEqual(['ana@example.com']);
		expect(emails[0].text).toContain(`https://miamicontactimprov.com/membership/manage?m=${id}`);
		expect(emails[0].text).not.toContain('friend');
		expect(Object.entries(emailHeaders[0]).find(([k]) => k.toLowerCase() === 'idempotency-key')?.[1]).toMatch(new RegExp(`^ci-member-email-${id}-[0-9a-f]{16}$`));

		const second = await webhook(completed());
		expect(second.body).toMatchObject({ ok: true, created: false, email: 'already_sent' });
		expect(emails).toHaveLength(1);
	});

	it('grants three friend passes for a purchase inside the BF window and says so in the email', async () => {
		interceptEmail(1);
		const res = await webhook(completed(subSession(), '2026-11-28T09:00:00-05:00'));
		expect(res.body.created).toBe(true);
		const m = (await getMember(testEnv(), await memberId()))!;
		expect(m.bf).toEqual({ campaign: 'bf-2026', purchased_at: '2026-11-28T14:00:00.000Z' });
		expect(m.friend_passes.map((p) => p.n)).toEqual([1, 2, 3]);
		expect(m.friend_passes.map((p) => p.available_from.slice(0, 10))).toEqual(['2026-11-28', '2026-12-28', '2027-01-28']);
		expect(m.friend_passes.every((p) => p.redeemed_at === null)).toBe(true);
		expect(emails[0].text).toContain('3 bring-a-friend passes');
		expect(emails[0].subject).toContain('friend passes');
	});

	it('decides the window on payment time (event.created): inclusive start and end, out just outside', async () => {
		const cases: Array<[string, boolean]> = [
			['2026-11-26T23:59:59-05:00', false],
			['2026-11-27T00:00:00-05:00', true],
			['2026-12-01T23:59:59-05:00', true],
			['2026-12-02T00:00:00-05:00', false],
		];
		for (const [at, inWindow] of cases) {
			interceptEmail(1);
			const customer = `cus_${at.replace(/\D/g, '')}`;
			await webhook(completed(subSession({ customer, subscription: `sub_${customer}` }), at));
			const m = (await getMember(testEnv(), await memberIdFor(TICKET_SECRET, customer)))!;
			expect(!!m.bf, at).toBe(inWindow);
			expect(m.friend_passes.length, at).toBe(inWindow ? 3 : 0);
		}
	});

	it('ignores another product on the shared account, unpaid sessions and sessions with no subscription', async () => {
		let r = await webhook(completed(subSession({ metadata: { product: 'something-else' } })));
		expect(r.body.skipped).toBe('not a CI membership');
		r = await webhook(completed(subSession({ payment_status: 'unpaid' })));
		expect(r.body.skipped).toBe('not paid');
		r = await webhook(completed(subSession({ subscription: null })));
		expect(r.body.skipped).toBe('no customer or subscription');
		expect(await getMember(testEnv(), await memberId())).toBeNull();
	});

	it('records a rejected welcome email on the member and still answers 200', async () => {
		interceptEmail(1, 422);
		const r = await webhook(completed());
		expect(r.status).toBe(200);
		expect(r.body.email).toBe('failed');
		expect((await getEmailState(testEnv(), await memberId()))!.error).toBe('422: bad');
	});

	it('answers 500 (Stripe retries) when Resend is down, and the retry sends it', async () => {
		interceptEmail(1, 500);
		expect((await webhook(completed())).status).toBe(500);
		interceptEmail(1);
		const retry = await webhook(completed());
		expect(retry.status).toBe(200);
		expect(retry.body.email).toBe('sent');
	});

	it('does not touch the ticket path: a payment-mode session is still a ticket', async () => {
		const r = await webhook({ id: 'e', type: 'checkout.session.completed', data: { object: { id: 'cs_test_x1x2x3x4x5x6', mode: 'payment', payment_status: 'paid', metadata: {} } } });
		expect(r.body.skipped).toBe('no class_date metadata');
	});

	it('requires a valid Stripe signature', async () => {
		const body = JSON.stringify(completed());
		const r = await call('/api/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': 't=1,v1=00' }, body });
		expect(r.status).toBe(400);
	});
});

describe('invoice.paid', () => {
	it('monthly: 4 credits on the first invoice, a renewal replaces them (no rollover), never twice for one invoice', async () => {
		const id = await memberId();
		const first = invoice({ billing_reason: 'subscription_create' });
		expect((await webhook(paid(first))).body).toMatchObject({ ok: true, granted: 4 });
		expect((await webhook(paid(first))).body).toMatchObject({ ok: true, duplicate: true });
		expect(await creditsRemaining(testEnv(), id)).toBe(4);
		const ledger = (await getLedger(testEnv(), id))!;
		expect(ledger.plan).toBe('monthly');
		expect(ledger.period_end).toBe('2027-01-01T00:00:00.000Z');
		expect(ledger.credit_invoice).toBe(first.id);

		const second = invoice({ lines: periodLines('2027-01-01T00:00:00Z', '2027-02-01T00:00:00Z') });
		expect((await webhook(paid(second))).body.granted).toBe(4);
		expect(await creditsRemaining(testEnv(), id)).toBe(4); // not 8: the first month's 4 expired
		expect((await getLedger(testEnv(), id))!.credit_invoice).toBe(second.id);
		const credits = await listCredits(testEnv(), id); // history kept
		expect(credits).toHaveLength(8);
		expect(new Set(credits.map((c) => c.id)).size).toBe(8);
	});

	it('credits are one KV key each, written once and never modified by a later check-in', async () => {
		const id = await memberId();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const names = (await env.TICKETS!.list({ prefix: `memcredit:${id}:` })).keys.map((k) => k.name);
		expect(names).toHaveLength(4);
		const before = await env.TICKETS!.get(names[0]);
		await burnCredit(testEnv(), id, '2026-12-04');
		expect(await env.TICKETS!.get(names[0])).toBe(before);
		expect(await env.TICKETS!.get(`memcr:${id}`)).not.toContain('"credits"');
	});

	it('unused credits of the previous period expire; a renewal gives exactly 4 whether 0, 2 or 4 were left', async () => {
		interceptEmail(1);
		await webhook(completed());
		const id = await memberId();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const credits = await listCredits(testEnv(), id);
		await env.TICKETS!.put(`memburn:${id}:${credits[0].id}`, '2026-12-04');
		await env.TICKETS!.put(`memburn:${id}:${credits[1].id}`, '2026-12-11');
		expect(await creditsRemaining(testEnv(), id)).toBe(2);
		const second = invoice({ lines: periodLines('2027-01-01T00:00:00Z', '2027-02-01T00:00:00Z') });
		expect((await webhook(paid(second))).body.granted).toBe(4);
		expect(await creditsRemaining(testEnv(), id)).toBe(4);
		// expired credits cannot be spent: four check-ins use only the new period's credits
		const spent = [];
		for (const d of ['2026-12-04', '2026-12-11', '2026-12-18', '2026-12-25']) {
			const r: any = await burnCredit(testEnv(), id, d);
			spent.push(r.credit_id);
		}
		expect(spent.every((c) => c.startsWith(`${second.id}.`))).toBe(true);
		expect(await burnCredit(testEnv(), id, '2027-01-01')).toEqual({ ok: false, error: 'no_credits' });
		// the old, unspent credits are still on file as history
		expect((await listCredits(testEnv(), id)).filter((c) => c.used_for === null)).toHaveLength(2);
	});

	it('an older invoice delivered after a newer one does not bring the old period back', async () => {
		const id = await memberId();
		const old = invoice({ billing_reason: 'subscription_create' });
		const newer = invoice({ lines: periodLines('2027-01-01T00:00:00Z', '2027-02-01T00:00:00Z') });
		await webhook(paid(newer));
		expect((await webhook(paid(old))).body.granted).toBe(0);
		expect((await getLedger(testEnv(), id))!.credit_invoice).toBe(newer.id);
		expect(await creditsRemaining(testEnv(), id)).toBe(4);
	});

	it('proration, manual, $0 and amount-less invoices carry no credits', async () => {
		expect((await webhook(paid(invoice({ billing_reason: 'subscription_update' })))).body.granted).toBe(0);
		expect((await webhook(paid(invoice({ billing_reason: 'manual' })))).body.granted).toBe(0);
		expect((await webhook(paid(invoice({ billing_reason: 'subscription_cycle', amount_paid: 0 })))).body.granted).toBe(0);
		expect((await webhook(paid(invoice({ billing_reason: 'subscription_cycle', amount_paid: undefined })))).body.granted).toBe(0);
		expect(await creditsRemaining(testEnv(), await memberId())).toBe(0);
	});

	it('a retry after a partial write grants the same credits once', async () => {
		const id = await memberId();
		const inv = invoice({ billing_reason: 'subscription_create' });
		// an earlier attempt wrote two credit keys and died before the ledger
		await env.TICKETS!.put(`memcredit:${id}:${inv.id}.1`, JSON.stringify({ id: `${inv.id}.1`, source_invoice: inv.id, granted_at: '2026-12-01T00:00:00.000Z', used_at: null, used_for: null }));
		expect((await webhook(paid(inv))).body.granted).toBe(4);
		const credits = await listCredits(testEnv(), id);
		expect(credits).toHaveLength(4);
		expect(credits.find((c) => c.id === `${inv.id}.1`)!.granted_at).toBe('2026-12-01T00:00:00.000Z');
	});

	it('yearly: no credit entries, period recorded', async () => {
		const inv = invoice({ billing_reason: 'subscription_create', parent: { subscription_details: { metadata: { product: 'ci-membership', plan: 'yearly' } } } });
		const r = await webhook(paid(inv));
		expect(r.body.granted).toBe(0);
		const ledger = (await getLedger(testEnv(), await memberId()))!;
		expect(ledger.plan).toBe('yearly');
		expect(await listCredits(testEnv(), await memberId())).toEqual([]);
	});

	it('recognises our invoice by price id when the API version carries no subscription metadata or lookup key', async () => {
		const [monthlyId] = Object.entries(MEMBERSHIP_PRICE_IDS).find(([, p]) => p === 'monthly')!;
		const inv = invoice({ billing_reason: 'subscription_create', parent: null, lines: { data: [{ period: { start: 1, end: 2 }, pricing: { price_details: { price: monthlyId } } }] } });
		expect((await webhook(paid(inv))).body.granted).toBe(4);
	});

	it("ignores another product's invoice on the shared account", async () => {
		const inv = { id: 'in_other', customer: 'cus_OTHER', billing_reason: 'subscription_cycle', amount_paid: 900, lines: { data: [{ price: { id: 'price_other', lookup_key: 'mindfold-monthly' } }] } };
		expect((await webhook(paid(inv))).body.skipped).toBe('not a CI membership invoice');
		expect(await getLedger(testEnv(), await memberIdFor(TICKET_SECRET, 'cus_OTHER'))).toBeNull();
	});

	it('arrives before checkout.session.completed: ledger first, member second, credits kept', async () => {
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		interceptEmail(1);
		await webhook(completed());
		const id = await memberId();
		expect((await getMember(testEnv(), id))!.status).toBe('active');
		expect(await creditsRemaining(testEnv(), id)).toBe(4);
	});
});

describe('customer.subscription.deleted', () => {
	const deleted = (sub: Record<string, unknown> = {}) => ({ id: 'evt_d', type: 'customer.subscription.deleted', created: 1, data: { object: { id: SUB, customer: CUS, metadata: { product: 'ci-membership' }, ...sub } } });

	it('marks the member canceled and keeps the ledger; a replay changes nothing', async () => {
		interceptEmail(1);
		await webhook(completed());
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		expect((await webhook(deleted())).body).toMatchObject({ ok: true, status: 'canceled' });
		const id = await memberId();
		const m = (await getMember(testEnv(), id))!;
		expect(m.status).toBe('canceled');
		expect(m.canceled_at).toBeTruthy();
		expect(await creditsRemaining(testEnv(), id)).toBe(4);
		expect((await webhook(deleted())).body.duplicate).toBe(true);
	});

	it('an older subscription ending does not cancel the current membership', async () => {
		interceptEmail(1);
		await webhook(completed());
		expect((await webhook(deleted({ id: 'sub_OLD' }))).body.skipped).toBe('older subscription');
		expect((await getMember(testEnv(), await memberId()))!.status).toBe('active');
	});

	it('ignores subscriptions that are not ours', async () => {
		expect((await webhook(deleted({ customer: 'cus_OTHER', metadata: {} }))).body.skipped).toBe('not a CI membership');
	});
});

describe('GET /api/membership/session', () => {
	const sessionUrl = `/api/membership/session?session_id=${SESSION_ID}`;
	function interceptSession(body: unknown, status = 200) {
		fetchMock.get(STRIPE).intercept({ method: 'GET', path: `/v1/checkout/sessions/${SESSION_ID}` }).reply(status, body as any);
	}

	it('reads bf from the stored profile, which the webhook decided on payment time', async () => {
		interceptEmail(1);
		await webhook(completed(subSession(), '2026-11-30T12:00:00-05:00'));
		// the session object says it was created long before; the stored decision wins
		interceptSession(subSession({ metadata: { product: 'ci-membership', plan: 'yearly', bf_at_start: '0' }, created: t('2026-10-01T12:00:00-05:00') }));
		const r = await call(sessionUrl);
		expect(r.status).toBe(200);
		expect(r.body).toMatchObject({ ok: true, paid: true, plan: 'yearly', bf: true, pending: false, friend_passes: 3 });
		expect(r.body.manage_url).toBe(`https://miamicontactimprov.com/membership/manage?m=${await memberId()}`);
	});

	it('bf is false for a member paid after the window even if the session opened inside it', async () => {
		interceptEmail(1);
		await webhook(completed(subSession(), '2026-12-02T00:30:00-05:00'));
		interceptSession(subSession({ metadata: { product: 'ci-membership', plan: 'monthly', bf_at_start: '1' }, created: t('2026-12-01T23:59:00-05:00') }));
		const r = await call(sessionUrl);
		expect(r.body).toMatchObject({ bf: false, pending: false, friend_passes: 0 });
	});

	it('is pending, never bf, before the webhook has written the profile', async () => {
		interceptSession(subSession({ metadata: { product: 'ci-membership', plan: 'monthly', bf_at_start: '1' }, created: t('2026-11-30T12:00:00-05:00') }));
		expect((await call(sessionUrl)).body).toMatchObject({ ok: true, bf: false, pending: true });
	});

	it('refuses unpaid sessions, other products, unknown sessions and bad ids', async () => {
		interceptSession(subSession({ payment_status: 'unpaid' }));
		expect((await call(sessionUrl)).status).toBe(402);
		interceptSession(subSession({ metadata: { product: 'other' } }));
		expect((await call(sessionUrl)).status).toBe(422);
		interceptSession({ error: {} }, 404);
		expect((await call(sessionUrl)).status).toBe(404);
		expect((await call('/api/membership/session?session_id=nope')).status).toBe(400);
	});
});

describe('POST /api/membership/portal', () => {
	it('returns a portal URL for a known member, bound to the configuration', async () => {
		interceptEmail(1);
		await webhook(completed());
		const id = await memberId();
		let sent: URLSearchParams | null = null;
		fetchMock.get(STRIPE).intercept({ method: 'POST', path: '/v1/billing_portal/sessions' }).reply(200, (o: any) => {
			sent = new URLSearchParams(String(o.body));
			return { url: 'https://billing.stripe.com/p/session/x' };
		});
		const r = await post('/api/membership/portal', { member_id: id });
		expect(r.body.url).toBe('https://billing.stripe.com/p/session/x');
		expect(sent!.get('customer')).toBe(CUS);
		expect(sent!.get('configuration')).toBe('bpc_test');
		expect(sent!.get('return_url')).toBe('https://miamicontactimprov.com/membership');
	});

	it('404 for an unknown member id, 400 for a malformed one', async () => {
		expect((await post('/api/membership/portal', { member_id: 'a'.repeat(32) })).status).toBe(404);
		expect((await post('/api/membership/portal', { member_id: 'nope' })).status).toBe(400);
		expect((await post('/api/membership/portal', {})).status).toBe(400);
	});
});

describe('host endpoints', () => {
	async function seedMember(customer = CUS, sub = SUB, at = '2026-11-20T10:00:00-05:00', email = 'Ana@Example.com') {
		interceptEmail(1);
		await webhook(completed(subSession({ customer, subscription: sub, id: `cs_test_${customer}x1x2x3x4`, customer_details: { name: 'Ana', email, phone: '' } }), at));
		return memberIdFor(TICKET_SECRET, customer);
	}

	it('the member list needs the admin token', async () => {
		expect((await call('/api/membership/members')).status).toBe(401);
		expect((await call('/api/membership/members', { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
		expect((await post('/api/membership/checkin', {}, {})).status).toBe(401);
	});

	it('lists members with credits left and friend passes, never the manage link; filters by email and status', async () => {
		await seedMember(CUS, SUB, '2026-11-28T09:00:00-05:00');
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const r = await call('/api/membership/members', { headers: admin });
		expect(r.status).toBe(200);
		expect(r.body.count).toBe(1);
		expect(r.body.members[0]).toMatchObject({ email: 'ana@example.com', plan: 'monthly', status: 'active', credits_remaining: 4, credits_used: 0, friend_passes_remaining: 3, duplicate_subscriptions: [] });
		expect(r.body.members[0].email_sent_at).toBeTruthy();
		expect('manage_url' in r.body.members[0]).toBe(false);
		expect(JSON.stringify(r.body)).not.toContain('/membership/manage');
		expect((await call('/api/membership/members?email=nobody@x.com', { headers: admin })).body.count).toBe(0);
		expect((await call('/api/membership/members?status=canceled', { headers: admin })).body.count).toBe(0);
		expect((await call('/api/membership/members?email=ANA@example.com&status=active', { headers: admin })).body.count).toBe(1);
	});

	it('paginates: limit and cursor walk every member once', async () => {
		for (const n of [1, 2, 3]) await seedMember(`cus_P${n}`, `sub_P${n}`, '2026-11-20T10:00:00-05:00', `p${n}@example.com`);
		const first = await call('/api/membership/members?limit=2', { headers: admin });
		expect(first.body.count).toBe(2);
		expect(first.body.next_cursor).toBeTruthy();
		const second = await call(`/api/membership/members?limit=2&cursor=${encodeURIComponent(first.body.next_cursor)}`, { headers: admin });
		expect(second.body.count).toBe(1);
		expect(second.body.next_cursor).toBeNull();
		const ids = [...first.body.members, ...second.body.members].map((m: any) => m.id);
		expect(new Set(ids).size).toBe(3);
	});

	it('check-in burns the oldest credit once per class date, then runs out', async () => {
		const id = await seedMember();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const dates = ['2026-12-04', '2026-12-11', '2026-12-18', '2026-12-25'];
		const first = await post('/api/membership/checkin', { member_id: id, date: dates[0] }, admin);
		expect(first.body).toMatchObject({ ok: true, credits_remaining: 3, credit_id: expect.stringContaining('.') });
		const again = await post('/api/membership/checkin', { email: 'ana@example.com', date: dates[0] }, admin);
		expect(again.body).toEqual({ ok: true, already: true });
		for (const d of dates.slice(1)) expect((await post('/api/membership/checkin', { member_id: id, date: d }, admin)).body.ok).toBe(true);
		const none = await post('/api/membership/checkin', { member_id: id, date: '2027-01-01' }, admin);
		expect(none.status).toBe(409);
		expect(none.body.error).toBe('no_credits');
		expect((await listCredits(testEnv(), id)).map((c) => c.used_for).sort()).toEqual(dates);
	});

	it('concurrent check-ins for different dates spend different credits', async () => {
		const id = await seedMember();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const dates = ['2026-12-04', '2026-12-11', '2026-12-18', '2026-12-25'];
		const results = await Promise.all(dates.map((d) => burnCredit(testEnv(), id, d)));
		expect(results.every((r) => r.ok)).toBe(true);
		const ids = results.map((r: any) => r.credit_id);
		expect(new Set(ids).size).toBe(4);
		expect(await creditsRemaining(testEnv(), id)).toBe(0);
	});

	it('a credit already claimed (memburn key) is skipped, and a claim on every credit means no_credits', async () => {
		const id = await seedMember();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const credits = await listCredits(testEnv(), id);
		const oldest = credits.sort((a, b) => a.granted_at.localeCompare(b.granted_at) || a.id.localeCompare(b.id))[0];
		await env.TICKETS!.put(`memburn:${id}:${oldest.id}`, '2026-11-27');
		const r: any = await burnCredit(testEnv(), id, '2026-12-04');
		expect(r.ok).toBe(true);
		expect(r.credit_id).not.toBe(oldest.id);
		for (const c of credits) await env.TICKETS!.put(`memburn:${id}:${c.id}`, '2026-11-27');
		expect(await burnCredit(testEnv(), id, '2026-12-11')).toEqual({ ok: false, error: 'no_credits' });
	});

	it('the same date scanned twice at once answers ok both times and a later scan is already; a duplicate spend is the accepted KV window', async () => {
		const id = await seedMember();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const [a, b] = await Promise.all([burnCredit(testEnv(), id, '2026-12-04'), burnCredit(testEnv(), id, '2026-12-04')]);
		expect(a.ok && b.ok).toBe(true);
		expect(await burnCredit(testEnv(), id, '2026-12-04')).toEqual({ ok: true, already: true });
		// at least one credit was spent; without compare-and-set both racers may keep theirs
		expect(await creditsRemaining(testEnv(), id)).toBeLessThanOrEqual(3);
		expect(await creditsRemaining(testEnv(), id)).toBeGreaterThanOrEqual(2);
	});

	it('check-in refuses an unknown member, an off-schedule date and a canceled member', async () => {
		const id = await seedMember();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		expect((await post('/api/membership/checkin', { member_id: 'b'.repeat(32), date: '2026-12-04' }, admin)).status).toBe(404);
		expect((await post('/api/membership/checkin', { member_id: id, date: '2026-12-05' }, admin)).body.error).toBe('unknown_date');
		await webhook({ id: 'e', type: 'customer.subscription.deleted', data: { object: { id: SUB, customer: CUS, metadata: { product: 'ci-membership' } } } });
		expect((await post('/api/membership/checkin', { member_id: id, date: '2026-12-04' }, admin)).body.error).toBe('inactive');
	});

	it('yearly: one class per ISO week, only inside the paid period, plan read from the ledger first', async () => {
		interceptEmail(1);
		await webhook(completed(subSession({ metadata: { product: 'ci-membership', plan: 'yearly' } })));
		const id = await memberId();
		const yearlyInv = (end: string) => invoice({ billing_reason: 'subscription_create', parent: { subscription_details: { metadata: { product: 'ci-membership', plan: 'yearly' } } }, lines: { data: [{ period: { start: t('2026-11-20T00:00:00Z'), end: t(end) } }] } });
		// no invoice seen yet: not provably paid up
		expect(await burnCredit(testEnv(), id, '2026-12-04')).toEqual({ ok: false, error: 'expired' });
		await webhook(paid(yearlyInv('2027-11-20T00:00:00Z')));
		expect((await burnCredit(testEnv(), id, '2026-12-04')).ok).toBe(true);
		expect(await burnCredit(testEnv(), id, '2026-12-04')).toEqual({ ok: true, already: true });
		expect((await burnCredit(testEnv(), id, '2026-12-11')).ok).toBe(true);
		// a period that has ended
		expect(await burnCredit(testEnv(), id, '2027-01-01', new Date('2027-12-01T00:00:00Z'))).toEqual({ ok: false, error: 'expired' });
	});

	it('uses ledger.plan over the profile plan', async () => {
		const id = await seedMember();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' }))); // ledger: monthly
		const profile = (await getMember(testEnv(), id))!;
		await env.TICKETS!.put(`mem:${id}`, JSON.stringify({ ...profile, plan: 'yearly' }));
		const r: any = await burnCredit(testEnv(), id, '2026-12-04');
		expect(r.ok).toBe(true);
		expect(r.credit_id).toContain('.');
	});
});

describe('access revocation', () => {
	const subEvent = (type: string, sub: Record<string, unknown> = {}) => ({ id: 'evt_s', type, created: 1, data: { object: { id: SUB, customer: CUS, status: 'active', metadata: { product: 'ci-membership' }, ...sub } } });
	async function active() {
		interceptEmail(1);
		await webhook(completed());
		await webhook(paid(invoice({ billing_reason: 'subscription_create', charge: 'ch_TEST1', payment_intent: 'pi_TEST1' })));
		return memberId();
	}

	it('past_due and unpaid suspend; the card recovering restores', async () => {
		const id = await active();
		expect((await webhook(subEvent('customer.subscription.updated', { status: 'past_due' }))).body).toMatchObject({ status: 'suspended' });
		expect((await getMember(testEnv(), id))).toMatchObject({ status: 'suspended', suspended_reason: 'payment' });
		expect((await burnCredit(testEnv(), id, '2026-12-04')).ok).toBe(false);
		expect((await webhook(subEvent('customer.subscription.updated', { status: 'unpaid' }))).body.unchanged).toBe(true);
		expect((await webhook(subEvent('customer.subscription.updated', { status: 'active' }))).body).toMatchObject({ status: 'active' });
		expect((await getMember(testEnv(), id))).toMatchObject({ status: 'active', suspended_reason: null });
		expect((await burnCredit(testEnv(), id, '2026-12-04')).ok).toBe(true);
	});

	it('a full refund of the membership payment suspends, and an active subscription does not undo it', async () => {
		const id = await active();
		expect((await webhook({ id: 'e', type: 'charge.refunded', data: { object: { id: 'ch_TEST1', payment_intent: 'pi_TEST1', refunded: true } } })).body).toMatchObject({ status: 'suspended', reason: 'refund' });
		expect((await burnCredit(testEnv(), id, '2026-12-04'))).toEqual({ ok: false, error: 'inactive' });
		await webhook(subEvent('customer.subscription.updated', { status: 'active' }));
		expect((await getMember(testEnv(), id))!.status).toBe('suspended');
		expect((await webhook({ id: 'e', type: 'charge.refunded', data: { object: { id: 'ch_TEST1', refunded: true } } })).body.duplicate).toBe(true);
	});

	it('a partial refund and a refund of some other payment change nothing', async () => {
		const id = await active();
		expect((await webhook({ id: 'e', type: 'charge.refunded', data: { object: { id: 'ch_TEST1', payment_intent: 'pi_TEST1', refunded: false, amount_refunded: 500 } } })).body.skipped).toBe('not a CI membership payment');
		expect((await webhook({ id: 'e', type: 'charge.refunded', data: { object: { id: 'ch_OTHER', payment_intent: 'pi_OTHER', refunded: true } } })).body.skipped).toBe('not a CI membership payment');
		expect((await getMember(testEnv(), id))!.status).toBe('active');
	});

	it('a dispute on the payment suspends; a dispute on another charge is ignored', async () => {
		const id = await active();
		expect((await webhook({ id: 'e', type: 'charge.dispute.created', data: { object: { id: 'dp_1', charge: 'ch_OTHER', payment_intent: null } } })).body.skipped).toBe('not a CI membership payment');
		expect((await webhook({ id: 'e', type: 'charge.dispute.created', data: { object: { id: 'dp_1', charge: 'ch_TEST1', payment_intent: 'pi_TEST1' } } })).body).toMatchObject({ status: 'suspended', reason: 'dispute' });
		expect((await getMember(testEnv(), id))!.suspended_reason).toBe('dispute');
	});

	it('syncs the plan from the subscription; other subscriptions and unknown customers are ignored', async () => {
		const id = await active();
		const r = await webhook(subEvent('customer.subscription.updated', { items: { data: [{ price: { id: 'price_1Ue7AyGR8ZpP3Rhovol4O08u' } }] } }));
		expect(r.body.plan).toBe('yearly');
		expect((await getMember(testEnv(), id))!.plan).toBe('yearly');
		expect((await webhook(subEvent('customer.subscription.updated', { id: 'sub_OTHER', status: 'past_due' }))).body.skipped).toBe('not the current subscription');
		expect((await webhook(subEvent('customer.subscription.updated', { customer: 'cus_NOBODY' }))).body.skipped).toBe('not a known member');
	});
});

describe('known customers buying again', () => {
	const deleted = { id: 'e', type: 'customer.subscription.deleted', data: { object: { id: SUB, customer: CUS, metadata: { product: 'ci-membership' } } } };

	it('a resubscription after cancel reactivates the member with the new subscription and plan', async () => {
		interceptEmail(2);
		await webhook(completed());
		await webhook(deleted);
		const id = await memberId();
		expect((await getMember(testEnv(), id))!.status).toBe('canceled');
		const again = await webhook(completed(subSession({ id: 'cs_test_second_session_1', subscription: 'sub_NEW', metadata: { product: 'ci-membership', plan: 'yearly' } })));
		expect(again.body).toMatchObject({ ok: true, created: false });
		expect(await getMember(testEnv(), id)).toMatchObject({ status: 'active', stripe_subscription: 'sub_NEW', plan: 'yearly', canceled_at: null });
		// the old subscription's late events no longer touch it
		expect((await webhook(deleted)).body.skipped).toBe('older subscription');
		expect((await getMember(testEnv(), id))!.status).toBe('active');
		// replaying either checkout session changes nothing and sends nothing more
		const replay = await webhook(completed(subSession({ id: 'cs_test_second_session_1', subscription: 'sub_NEW', metadata: { product: 'ci-membership', plan: 'yearly' } })));
		expect(replay.body.email).toBe('already_sent');
		expect(emails).toHaveLength(2);
	});

	it('a second paid subscription while one runs is kept out of access and flagged', async () => {
		interceptEmail(2);
		await webhook(completed());
		const r = await webhook(completed(subSession({ id: 'cs_test_dupe_session_01', subscription: 'sub_DUPE' })));
		expect(r.body.double_subscription).toBe(true);
		const m = (await getMember(testEnv(), await memberId()))!;
		expect(m.stripe_subscription).toBe(SUB);
		expect(m.extra_subscriptions).toEqual(['sub_DUPE']);
		const list = await call('/api/membership/members', { headers: admin });
		expect(list.body.members[0].duplicate_subscriptions).toEqual(['sub_DUPE']);
	});

	it('a repeat buyer gets friend passes once, not per purchase', async () => {
		interceptEmail(2);
		await webhook(completed(subSession(), '2026-11-27T10:00:00-05:00'));
		const id = await memberId();
		const first = (await getMember(testEnv(), id))!;
		await webhook(deleted);
		await webhook(completed(subSession({ id: 'cs_test_repeat_session_1', subscription: 'sub_AGAIN' }), '2026-11-29T10:00:00-05:00'));
		const m = (await getMember(testEnv(), id))!;
		expect(m.status).toBe('active');
		expect(m.bf).toEqual(first.bf);
		expect(m.friend_passes).toEqual(first.friend_passes);
	});

	it('an existing member who first buys inside the window gets the passes', async () => {
		interceptEmail(2);
		await webhook(completed(subSession(), '2026-11-20T10:00:00-05:00'));
		const id = await memberId();
		expect((await getMember(testEnv(), id))!.bf).toBeNull();
		await webhook(deleted);
		await webhook(completed(subSession({ id: 'cs_test_late_session_001', subscription: 'sub_LATE' }), '2026-11-30T10:00:00-05:00'));
		expect((await getMember(testEnv(), id))!.friend_passes).toHaveLength(3);
	});

	it('checkout with a known address reuses the Stripe customer and refuses a second live membership', async () => {
		interceptEmail(1);
		await webhook(completed());
		// known customer, canceled membership would be allowed; here it is active
		interceptPrice('ci-member-monthly-40', 'price_m');
		interceptCustomer(CUS);
		const refused = await post('/api/membership/checkout', { plan: 'monthly', email: 'ana@example.com' });
		expect(refused.status).toBe(409);
		expect(refused.body.error).toBe('already_member');
		await webhook(deleted);
		interceptPrice('ci-member-monthly-40', 'price_m');
		interceptCustomer(CUS);
		interceptSubSession();
		const ok = await post('/api/membership/checkout', { plan: 'monthly', email: 'ana@example.com' });
		expect(ok.status).toBe(200);
		expect(sessions[0].get('customer')).toBe(CUS);
		expect(sessions[0].has('customer_email')).toBe(false);
	});

	it('an address with no Stripe customer yet is just prefilled', async () => {
		interceptPrice('ci-member-monthly-40', 'price_m');
		interceptCustomer(null);
		interceptSubSession();
		await post('/api/membership/checkout', { plan: 'monthly', email: 'new@example.com' });
		expect(sessions[0].get('customer_email')).toBe('new@example.com');
		expect(sessions[0].has('customer')).toBe(false);
	});
});

describe('async payment and member id handling', () => {
	it('checkout.session.async_payment_succeeded in subscription mode creates the member', async () => {
		interceptEmail(1);
		const r = await webhook({ id: 'e', type: 'checkout.session.async_payment_succeeded', created: t('2026-11-20T10:00:00-05:00'), data: { object: subSession() } });
		expect(r.body).toMatchObject({ ok: true, created: true });
		expect((await getMember(testEnv(), await memberId()))!.status).toBe('active');
	});

	it('async_payment_succeeded for a payment-mode ticket still goes to the ticket path', async () => {
		const r = await webhook({ id: 'e', type: 'checkout.session.async_payment_succeeded', data: { object: { id: 'cs_test_x1x2x3x4x5x6', mode: 'payment', payment_status: 'paid', metadata: {} } } });
		expect(r.body.skipped).toBe('no class_date metadata');
	});

	it('v1 ids are unchanged; another version salts the input', async () => {
		const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(TICKET_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
		const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`ci-member:${CUS}`));
		const legacy = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
		expect(await memberIdFor(TICKET_SECRET, CUS)).toBe(legacy);
		expect(await memberIdFor(TICKET_SECRET, CUS, 'v1')).toBe(legacy);
		expect(await memberIdFor(TICKET_SECRET, CUS, 'v2')).not.toBe(legacy);
		// the env switch reaches the webhook
		interceptEmail(1);
		await webhook(completed(), testEnv({ CI_MEMBER_ID_VERSION: 'v2' }));
		expect(await getMember(testEnv(), legacy)).toBeNull();
		expect(await getMember(testEnv(), await memberIdFor(TICKET_SECRET, CUS, 'v2'))).not.toBeNull();
	});

	it('logs a short hash, never the member id', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		await webhook(completed(subSession({ customer_details: { name: 'x', email: '', phone: '' } })));
		const id = await memberId();
		const logged = JSON.stringify(spy.mock.calls);
		spy.mockRestore();
		expect(logged).toContain('no email on session');
		expect(logged).not.toContain(id);
		expect(logged).toContain(await shortId(id));
		expect((await shortId(id))).toHaveLength(8);
	});
});

describe('listTicketsForBf', () => {
	it('says when the cap cut the scan', async () => {
		for (let i = 1; i <= 3; i++) await env.TICKETS!.put(`tkt:${String(i).padStart(32, '0')}`, JSON.stringify({ id: String(i).padStart(32, '0'), email: `a${i}@x.com`, event_date: '2026-10-02' }));
		expect((await listTicketsForBf(testEnv(), 2)).truncated).toBe(true);
		expect((await listTicketsForBf(testEnv(), 10)).truncated).toBe(false);
	});
});

describe('buildMembershipEmail', () => {
	it('mentions the plan terms and, only for BF members, the passes', () => {
		const base: any = { id: 'a'.repeat(32), name: '', plan: 'yearly', bf: null };
		expect(buildMembershipEmail(base).text).toContain('one class every week');
		expect(buildMembershipEmail(base).text).not.toContain('Black Friday');
		const bf = buildMembershipEmail({ ...base, plan: 'monthly', bf: { campaign: 'bf-2026', purchased_at: 'x' } });
		expect(bf.text).toContain('4 classes each billing month');
		expect(bf.text).toContain("Unused classes don't carry over");
		expect(bf.text).not.toMatch(/roll|banked/i);
		expect(bf.text).toContain('3 bring-a-friend passes, one a month for your first three months');
		expect(bf.html).toContain('/membership/manage?m=');
	});
});
