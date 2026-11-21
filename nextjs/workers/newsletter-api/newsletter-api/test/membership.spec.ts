import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';
import { burnCredit, getLedger, getMember, memberIdFor, MEMBERSHIP_PRICE_IDS } from '../src/membership';
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
		expect(m.email_sent_at).toBeTruthy();
		expect(emails[0].to).toEqual(['ana@example.com']);
		expect(emails[0].text).toContain(`https://miamicontactimprov.com/membership/manage?m=${id}`);
		expect(emails[0].text).not.toContain('friend');
		expect(Object.entries(emailHeaders[0]).find(([k]) => k.toLowerCase() === 'idempotency-key')?.[1]).toBe(`ci-member-email-${id}`);

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
		expect((await getMember(testEnv(), await memberId()))!.email_error).toBe('422: bad');
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
	it('monthly: +4 credits on the first invoice, +4 on renewal, capped at 8 banked, never twice for one invoice', async () => {
		const id = await memberId();
		const first = invoice({ billing_reason: 'subscription_create' });
		expect((await webhook(paid(first))).body).toMatchObject({ ok: true, granted: 4 });
		expect((await webhook(paid(first))).body).toMatchObject({ ok: true, duplicate: true });
		let ledger = (await getLedger(testEnv(), id))!;
		expect(ledger.credits).toHaveLength(4);
		expect(ledger.plan).toBe('monthly');
		expect(ledger.period_end).toBe('2027-01-01T00:00:00.000Z');

		expect((await webhook(paid(invoice()))).body.granted).toBe(4);
		expect((await webhook(paid(invoice()))).body.granted).toBe(0); // already 8 banked
		ledger = (await getLedger(testEnv(), id))!;
		expect(ledger.credits).toHaveLength(8);
		expect(new Set(ledger.credits.map((c) => c.id)).size).toBe(8);
	});

	it('tops up only to the cap when some credits were used', async () => {
		const id = await memberId();
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const ledger = (await getLedger(testEnv(), id))!;
		ledger.credits[0].used_at = '2026-12-04T00:00:00Z';
		ledger.credits[1].used_at = '2026-12-11T00:00:00Z';
		await env.TICKETS!.put(`memcr:${id}`, JSON.stringify(ledger));
		expect((await webhook(paid(invoice()))).body.granted).toBe(4); // 2 unused + 4 = 6
		expect((await webhook(paid(invoice()))).body.granted).toBe(2); // 6 + 2 = 8
	});

	it('proration and manual invoices carry no credits', async () => {
		expect((await webhook(paid(invoice({ billing_reason: 'subscription_update' })))).body.granted).toBe(0);
		expect((await webhook(paid(invoice({ billing_reason: 'manual' })))).body.granted).toBe(0);
	});

	it('yearly: no credit ledger entries, period recorded', async () => {
		const inv = invoice({ billing_reason: 'subscription_create', parent: { subscription_details: { metadata: { product: 'ci-membership', plan: 'yearly' } } } });
		const r = await webhook(paid(inv));
		expect(r.body.granted).toBe(0);
		const ledger = (await getLedger(testEnv(), await memberId()))!;
		expect(ledger.plan).toBe('yearly');
		expect(ledger.credits).toEqual([]);
	});

	it('recognises our invoice by price id when the API version carries no subscription metadata or lookup key', async () => {
		const [monthlyId] = Object.entries(MEMBERSHIP_PRICE_IDS).find(([, p]) => p === 'monthly')!;
		const inv = invoice({ billing_reason: 'subscription_create', parent: null, lines: { data: [{ period: { start: 1, end: 2 }, pricing: { price_details: { price: monthlyId } } }] } });
		expect((await webhook(paid(inv))).body.granted).toBe(4);
	});

	it("ignores another product's invoice on the shared account", async () => {
		const inv = { id: 'in_other', customer: 'cus_OTHER', billing_reason: 'subscription_cycle', lines: { data: [{ price: { id: 'price_other', lookup_key: 'mindfold-monthly' } }] } };
		expect((await webhook(paid(inv))).body.skipped).toBe('not a CI membership invoice');
		expect(await getLedger(testEnv(), await memberIdFor(TICKET_SECRET, 'cus_OTHER'))).toBeNull();
	});

	it('arrives before checkout.session.completed: ledger first, member second, credits kept', async () => {
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		interceptEmail(1);
		await webhook(completed());
		const id = await memberId();
		expect((await getMember(testEnv(), id))!.status).toBe('active');
		expect((await getLedger(testEnv(), id))!.credits).toHaveLength(4);
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
		expect((await getLedger(testEnv(), id))!.credits).toHaveLength(4);
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

	it('confirms a paid membership session and returns the manage link', async () => {
		interceptSession(subSession({ metadata: { product: 'ci-membership', plan: 'yearly', bf_at_start: '1' }, created: t('2026-11-30T12:00:00-05:00') }));
		const r = await call(sessionUrl);
		expect(r.status).toBe(200);
		expect(r.body).toMatchObject({ ok: true, paid: true, plan: 'yearly', bf: true, friend_passes: 3 });
		expect(r.body.manage_url).toBe(`https://miamicontactimprov.com/membership/manage?m=${await memberId()}`);
	});

	it('bf is false when the session opened in the window but was paid after it', async () => {
		interceptSession(subSession({ metadata: { product: 'ci-membership', plan: 'monthly', bf_at_start: '1' }, created: t('2026-12-02T00:30:00-05:00') }));
		expect((await call(sessionUrl)).body.bf).toBe(false);
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
	it('the member list needs the admin token', async () => {
		expect((await call('/api/membership/members')).status).toBe(401);
		expect((await call('/api/membership/members', { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
		expect((await post('/api/membership/checkin', {}, {})).status).toBe(401);
	});

	it('lists members with credits left, friend passes and the manage link; filters by email and status', async () => {
		interceptEmail(1);
		await webhook(completed(subSession(), '2026-11-28T09:00:00-05:00'));
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const r = await call('/api/membership/members', { headers: admin });
		expect(r.status).toBe(200);
		expect(r.body.count).toBe(1);
		expect(r.body.members[0]).toMatchObject({ email: 'ana@example.com', plan: 'monthly', status: 'active', credits_remaining: 4, credits_used: 0, friend_passes_remaining: 3 });
		expect(r.body.members[0].manage_url).toContain('/membership/manage?m=');
		expect((await call('/api/membership/members?email=nobody@x.com', { headers: admin })).body.count).toBe(0);
		expect((await call('/api/membership/members?status=canceled', { headers: admin })).body.count).toBe(0);
		expect((await call('/api/membership/members?email=ANA@example.com&status=active', { headers: admin })).body.count).toBe(1);
	});

	it('check-in burns the oldest credit once per class date, then runs out', async () => {
		interceptEmail(1);
		await webhook(completed());
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const id = await memberId();
		const dates = ['2026-12-04', '2026-12-11', '2026-12-18', '2026-12-25'];
		const first = await post('/api/membership/checkin', { member_id: id, date: dates[0] }, admin);
		expect(first.body).toMatchObject({ ok: true, credits_remaining: 3, credit_id: expect.stringContaining(':') });
		const again = await post('/api/membership/checkin', { email: 'ana@example.com', date: dates[0] }, admin);
		expect(again.body).toEqual({ ok: true, already: true });
		for (const d of dates.slice(1)) expect((await post('/api/membership/checkin', { member_id: id, date: d }, admin)).body.ok).toBe(true);
		const none = await post('/api/membership/checkin', { member_id: id, date: '2027-01-01' }, admin);
		expect(none.status).toBe(409);
		expect(none.body.error).toBe('no_credits');
		expect((await getLedger(testEnv(), id))!.credits.filter((c) => c.used_at).map((c) => c.used_for)).toEqual(dates);
	});

	it('check-in refuses an unknown member, an off-schedule date and a canceled member', async () => {
		interceptEmail(1);
		await webhook(completed());
		await webhook(paid(invoice({ billing_reason: 'subscription_create' })));
		const id = await memberId();
		expect((await post('/api/membership/checkin', { member_id: 'b'.repeat(32), date: '2026-12-04' }, admin)).status).toBe(404);
		expect((await post('/api/membership/checkin', { member_id: id, date: '2026-12-05' }, admin)).body.error).toBe('unknown_date');
		await webhook({ id: 'e', type: 'customer.subscription.deleted', data: { object: { id: SUB, customer: CUS, metadata: { product: 'ci-membership' } } } });
		expect((await post('/api/membership/checkin', { member_id: id, date: '2026-12-04' }, admin)).body.error).toBe('inactive');
	});

	it('yearly allows one class per ISO week', async () => {
		interceptEmail(1);
		await webhook(completed(subSession({ metadata: { product: 'ci-membership', plan: 'yearly' } })));
		const id = await memberId();
		expect((await burnCredit(testEnv(), id, '2026-12-04')).ok).toBe(true);
		expect(await burnCredit(testEnv(), id, '2026-12-04')).toEqual({ ok: true, already: true });
		expect((await burnCredit(testEnv(), id, '2026-12-11')).ok).toBe(true);
	});
});

describe('buildMembershipEmail', () => {
	it('mentions the plan terms and, only for BF members, the passes', () => {
		const base: any = { id: 'a'.repeat(32), name: '', plan: 'yearly', bf: null };
		expect(buildMembershipEmail(base).text).toContain('one class every week');
		expect(buildMembershipEmail(base).text).not.toContain('Black Friday');
		const bf = buildMembershipEmail({ ...base, plan: 'monthly', bf: { campaign: 'bf-2026', purchased_at: 'x' } });
		expect(bf.text).toContain('4 class credits each billing month');
		expect(bf.text).toContain('up to 8 banked');
		expect(bf.text).toContain('3 bring-a-friend passes, one a month for your first three months');
		expect(bf.html).toContain('/membership/manage?m=');
	});
});
