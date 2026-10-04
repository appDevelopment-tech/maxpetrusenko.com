import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';
import { stripeSignature } from '../src/webhook';
import { stripeModeError } from '../src/stripe';

const STRIPE_ORIGIN = 'https://api.stripe.com';
const WEBHOOK_SECRET = 'whsec_test_only';
const DATE = '2026-11-20';

const PRICES: Record<string, { id: string; unit_amount: number }> = {
	'ci-ticket-online-friday': { id: 'price_class_test', unit_amount: 2000 },
	'ci-class-15': { id: 'price_class15_test', unit_amount: 1500 },
};

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, { STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET, RESEND_API_KEY: undefined }, overrides) as unknown as Env;
}

async function call(path: string, init: RequestInit, overrides: Record<string, unknown> = {}): Promise<{ status: number; body: any; headers: Headers }> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(new Request(`https://newsletter.test${path}`, init), testEnv(overrides), ctx);
	await waitOnExecutionContext(ctx);
	const text = await response.text();
	return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
}

function post(path: string, payload: unknown, headers: Record<string, string> = {}, overrides: Record<string, unknown> = {}) {
	return call(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) }, overrides);
}

// Stripe mock that behaves like Stripe's idempotency: the same key returns the
// same session instead of creating a second one.
const created: { byKey: Map<string, string>; keys: string[]; count: number } = { byKey: new Map(), keys: [], count: 0 };

function headerOf(headers: unknown, name: string): string {
	if (!headers) return '';
	if (Array.isArray(headers)) {
		for (let i = 0; i < headers.length; i += 2) if (String(headers[i]).toLowerCase() === name.toLowerCase()) return String(headers[i + 1]);
		return '';
	}
	for (const [k, v] of Object.entries(headers as Record<string, string>)) if (k.toLowerCase() === name.toLowerCase()) return String(v);
	return '';
}

function interceptStripe({ prices = 1, sessions = 1, past = 0, pastData = [] as unknown[] } = {}) {
	const pool = fetchMock.get(STRIPE_ORIGIN);
	if (past) pool.intercept({ method: 'GET', path: /\/v1\/checkout\/sessions\?/ }).reply(200, { data: pastData }).times(past);
	if (prices)
		pool
			.intercept({ method: 'GET', path: /\/v1\/prices\?/ })
			.reply(200, (opts: any) => {
				const url = new URL(String(opts.path), STRIPE_ORIGIN);
				const price = PRICES[url.searchParams.get('lookup_keys[]') ?? ''];
				return { data: price ? [price] : [] };
			})
			.times(prices);
	if (sessions)
		pool
			.intercept({ method: 'POST', path: '/v1/checkout/sessions' })
			.reply(200, (opts: any) => {
				const key = headerOf(opts.headers, 'Idempotency-Key');
				created.keys.push(key);
				if (key && created.byKey.has(key)) return { url: created.byKey.get(key) };
				created.count += 1;
				const url = `https://checkout.stripe.com/c/pay/cs_test_${created.count}`;
				if (key) created.byKey.set(key, url);
				return { url };
			})
			.times(sessions);
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(() => {
	created.byKey.clear();
	created.keys.length = 0;
	created.count = 0;
	vi.useRealTimers();
	fetchMock.assertNoPendingInterceptors();
});

function freezeClock() {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-10-05T12:00:10Z'));
}

describe('first-class double claim', () => {
	it('two concurrent first-class checkouts for one email produce at most one Stripe session', async () => {
		freezeClock();
		await post('/api/first-class', { email: 'twice@example.com', consent: true });
		interceptStripe({ prices: 2, sessions: 2, past: 2 });

		const results = await Promise.all([
			post('/api/checkout', { ticket_type: 'first', email: 'twice@example.com', event_date: DATE }),
			post('/api/checkout', { ticket_type: 'first', email: 'Twice@Example.com', event_date: DATE }),
		]).catch((e) => {
			throw e;
		});
		const urls = new Set(results.filter((r) => r.status === 200).map((r) => r.body.url));
		expect(urls.size).toBe(1);
		expect(created.count).toBe(1);
		for (const r of results) expect([200, 409]).toContain(r.status);
		// Whatever the interleaving, unused interceptors are not a failure here.
		fetchMock.deactivate();
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	it('a second first-class checkout while the first session is open gets the uniform 409', async () => {
		await post('/api/first-class', { email: 'open@example.com', consent: true });
		interceptStripe({ past: 1 });
		expect((await post('/api/checkout', { ticket_type: 'first', email: 'open@example.com', event_date: DATE })).status).toBe(200);
		const second = await post('/api/checkout', { ticket_type: 'first', email: 'open@example.com', event_date: '2026-11-13' });
		expect(second).toMatchObject({ status: 409, body: { ok: false, error: 'first_offer_unavailable' } });
	});

	it('a failed Stripe session call clears the pending marker so the buyer can retry', async () => {
		await post('/api/first-class', { email: 'retry@example.com', consent: true });
		interceptStripe({ past: 1, sessions: 0 });
		fetchMock.get(STRIPE_ORIGIN).intercept({ method: 'POST', path: '/v1/checkout/sessions' }).reply(400, { error: { message: 'bad' } });
		expect((await post('/api/checkout', { ticket_type: 'first', email: 'retry@example.com', event_date: DATE })).status).toBe(502);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('retry@example.com')) ?? '{}');
		expect(stored.first_pending_until).toBeUndefined();
	});
});

describe('idempotency key', () => {
	it('first class: same email, event and minute share a key; the key is not the raw email', async () => {
		freezeClock();
		await post('/api/first-class', { email: 'idem@example.com', consent: true });
		interceptStripe({ past: 1 });
		await post('/api/checkout', { ticket_type: 'first', email: 'idem@example.com', event_date: DATE });
		expect(created.keys[0]).toMatch(/^ci-first-[0-9a-f]{64}$/);
		expect(created.keys[0]).not.toContain('idem');
	});

	it('same IP, same offer, same minute: same key and same session; a different handle: a new one', async () => {
		freezeClock();
		interceptStripe({ prices: 3, sessions: 3 });
		const ip = { 'CF-Connecting-IP': '203.0.113.7' };
		const body = { ticket_type: 'community', share_channel: 'whatsapp_group', handle: 'group a', event_date: DATE };
		const a = await post('/api/checkout', body, ip);
		const b = await post('/api/checkout', body, ip);
		const c = await post('/api/checkout', { ...body, handle: 'group b' }, ip);
		expect(created.keys[0]).toBe(created.keys[1]);
		expect(a.body.url).toBe(b.body.url);
		expect(created.keys[2]).not.toBe(created.keys[0]);
		expect(c.body.url).not.toBe(a.body.url);
	});

});

describe('Stripe webhook', () => {
	async function webhook(event: unknown, opts: { secret?: string; ageSeconds?: number } = {}) {
		const payload = JSON.stringify(event);
		const t = Math.floor(Date.now() / 1000) - (opts.ageSeconds ?? 0);
		const sig = await stripeSignature(opts.secret ?? WEBHOOK_SECRET, t, payload);
		return call('/api/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${t},v1=${sig}` }, body: payload });
	}

	const completed = (email: string, extra: Record<string, unknown> = {}) => ({
		type: 'checkout.session.completed',
		data: { object: { id: 'cs_test_x', payment_status: 'paid', customer_details: { email }, metadata: { product: 'ci-class', ticket_type: 'early' }, ...extra } },
	});

	it('a paid CI session sets first_discount_claimed (mixed-case email) and clears pending', async () => {
		await env.EMAIL_SUBS.put('mixed@example.com', JSON.stringify({ email: 'mixed@example.com', first_offer_issued_at: 1, first_pending_until: Date.now() + 1e6 }));
		const res = await webhook(completed(' Mixed@Example.COM '));
		expect(res.status).toBe(200);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('mixed@example.com')) ?? '{}');
		expect(stored.first_discount_claimed).toBe(true);
		expect(stored.first_pending_until).toBeUndefined();
	});

	it('after the webhook, the same email is refused the first-class price without a Stripe lookup', async () => {
		await post('/api/first-class', { email: 'paid@example.com', consent: true });
		await webhook(completed('paid@example.com'));
		const res = await post('/api/checkout', { ticket_type: 'first', email: 'PAID@example.com', event_date: DATE });
		expect(res.status).toBe(409);
	});

	it('an expired first-class session clears pending', async () => {
		await env.EMAIL_SUBS.put('exp@example.com', JSON.stringify({ email: 'exp@example.com', first_pending_until: Date.now() + 1e6 }));
		await webhook({ type: 'checkout.session.expired', data: { object: { customer_email: 'exp@example.com', metadata: { product: 'ci-class', first_discount: 'true' } } } });
		const stored = JSON.parse((await env.EMAIL_SUBS.get('exp@example.com')) ?? '{}');
		expect(stored.first_pending_until).toBeUndefined();
		expect(stored.first_discount_claimed).toBeUndefined();
	});

	it('does not create a subscriber record for a buyer who never left an email', async () => {
		await webhook(completed('stranger@example.com'));
		expect(await env.EMAIL_SUBS.get('stranger@example.com')).toBeNull();
	});

	it('ignores sessions for other products on the shared account', async () => {
		await env.EMAIL_SUBS.put('retreat@example.com', JSON.stringify({ email: 'retreat@example.com' }));
		await webhook(completed('retreat@example.com', { metadata: { product: 'blindfolded-retreat' } }));
		const stored = JSON.parse((await env.EMAIL_SUBS.get('retreat@example.com')) ?? '{}');
		expect(stored.first_discount_claimed).toBeUndefined();
	});

	it('rejects a bad signature, a stale timestamp, and a missing secret', async () => {
		expect((await webhook(completed('a@example.com'), { secret: 'whsec_wrong' })).status).toBe(400);
		expect((await webhook(completed('a@example.com'), { ageSeconds: 600 })).status).toBe(400);
		const noSecret = await call('/api/stripe/webhook', { method: 'POST', body: '{}' }, { STRIPE_WEBHOOK_SECRET: undefined });
		expect(noSecret.status).toBe(500);
	});
});

describe('ambassador allowlist', () => {
	it('writes referrer_verified into the session metadata', async () => {
		await env.AMBASSADORS.put('ambassador:ana', '{}');
		const bodies: URLSearchParams[] = [];
		fetchMock
			.get(STRIPE_ORIGIN)
			.intercept({ method: 'GET', path: /\/v1\/prices\?/ })
			.reply(200, { data: [PRICES['ci-class-15']] })
			.times(2);
		fetchMock
			.get(STRIPE_ORIGIN)
			.intercept({ method: 'POST', path: '/v1/checkout/sessions' })
			.reply(200, (opts: any) => {
				bodies.push(new URLSearchParams(String(opts.body)));
				return { url: 'https://checkout.stripe.com/c/pay/x' };
			})
			.times(2);
		await post('/api/checkout', { ticket_type: 'referral', referrer: 'ana', event_date: DATE });
		await post('/api/checkout', { ticket_type: 'referral', referrer: 'nobody', event_date: DATE });
		expect(bodies[0].get('metadata[referrer_verified]')).toBe('true');
		expect(bodies[1].get('metadata[referrer_verified]')).toBe('false');
		expect(bodies[1].get('payment_intent_data[metadata][referrer_verified]')).toBe('false');
	});
});

describe('abuse controls', () => {
	const blocked = { limit: async () => ({ success: false }) };

	it('rate limits /api/* per client IP with 429', async () => {
		const res = await post('/api/checkout', { event_date: DATE }, { 'CF-Connecting-IP': '198.51.100.1' }, { API_LIMITER: blocked });
		expect(res.status).toBe(429);
		const sub = await post('/api/first-class', { email: 'x@example.com', consent: true }, { 'CF-Connecting-IP': '198.51.100.1' }, { API_LIMITER: blocked });
		expect(sub.status).toBe(429);
	});

	it('never rate limits the Stripe webhook', async () => {
		const res = await call('/api/stripe/webhook', { method: 'POST', headers: { 'CF-Connecting-IP': '198.51.100.1' }, body: '{}' }, { API_LIMITER: blocked });
		expect(res.status).toBe(400); // reached signature check, not 429
	});

	it('CORS: checkout answers only the CI site; subscribe also answers maxpetrusenko.com', async () => {
		const preflight = (path: string, origin: string) =>
			call(path, { method: 'OPTIONS', headers: { Origin: origin } }).then((r) => r.headers.get('Access-Control-Allow-Origin'));
		expect(await preflight('/api/checkout', 'https://miamicontactimprov.com')).toBe('https://miamicontactimprov.com');
		expect(await preflight('/api/checkout', 'https://evil.example')).toBeNull();
		expect(await preflight('/api/checkout', 'https://maxpetrusenko.com')).toBeNull();
		expect(await preflight('/api/subscribe', 'https://maxpetrusenko.com')).toBe('https://maxpetrusenko.com');
	});
});

describe('STRIPE_MODE guard', () => {
	it('matches key prefix to mode', () => {
		expect(stripeModeError('sk_test_x', undefined)).toBeNull();
		expect(stripeModeError('rk_test_x', 'test')).toBeNull();
		expect(stripeModeError('sk_live_x', undefined)).not.toBeNull();
		expect(stripeModeError('sk_test_x', 'live')).not.toBeNull();
		expect(stripeModeError('sk_live_x', 'live')).toBeNull();
		expect(stripeModeError('sk_test_x', 'prod')).not.toBeNull();
	});

	it('refuses checkout before any Stripe call when the key does not match the mode', async () => {
		const res = await post('/api/checkout', { event_date: DATE }, {}, { STRIPE_SECRET_KEY: 'sk_live_oops' });
		expect(res.status).toBe(500);
		expect(res.body.error).toBe('Stripe not configured');
	});
});

describe('webhook beats pending', () => {
	it('a claimed record never gets a pending marker back', async () => {
		const { setFirstPending } = await import('../src/tickets');
		await env.EMAIL_SUBS.put('won@example.com', JSON.stringify({ email: 'won@example.com', first_offer_issued_at: 1, first_discount_claimed: true }));
		await setFirstPending(testEnv(), 'won@example.com', Date.now() + 1e6);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('won@example.com')) ?? '{}');
		expect(stored.first_pending_until).toBeUndefined();
		expect(stored.first_discount_claimed).toBe(true);
	});
});
