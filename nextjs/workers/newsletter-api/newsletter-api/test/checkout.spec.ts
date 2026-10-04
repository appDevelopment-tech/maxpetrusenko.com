import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';

const STRIPE_ORIGIN = 'https://api.stripe.com';
const STRIPE_SECRET_KEY = 'sk_test_fixture_not_a_real_key';

const PRICES: Record<string, { id: string; unit_amount: number }> = {
	'ci-class-sliding': { id: 'price_class_test', unit_amount: null as unknown as number },
	'ci-jam-dropin': { id: 'price_jam_test', unit_amount: 1500 },
	'ci-combo-dropin': { id: 'price_combo_test', unit_amount: 3000 },
};

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, { STRIPE_SECRET_KEY }, overrides) as unknown as Env;
}

async function call(path: string, init: RequestInit = {}, requestEnv: Env = testEnv()): Promise<{ status: number; body: any }> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(new Request(`https://newsletter.test${path}`, init), requestEnv, ctx);
	await waitOnExecutionContext(ctx);
	const text = await response.text();
	return { status: response.status, body: text ? JSON.parse(text) : null };
}

function checkout(payload: Record<string, unknown>, requestEnv: Env = testEnv()) {
	return call(
		'/api/checkout',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		},
		requestEnv,
	);
}

const sent: { sessions: URLSearchParams[] } = { sessions: [] };

function interceptPrices(times = 1) {
	fetchMock
		.get(STRIPE_ORIGIN)
		.intercept({ method: 'GET', path: /\/v1\/prices\?/ })
		.reply(200, (opts: any) => {
			const url = new URL(String(opts.path), STRIPE_ORIGIN);
			const lookupKey = url.searchParams.get('lookup_keys[]') ?? '';
			const price = PRICES[lookupKey];
			return { data: price ? [price] : [] };
		})
		.times(times);
}

function interceptSessions(times = 1) {
	fetchMock
		.get(STRIPE_ORIGIN)
		.intercept({ method: 'POST', path: '/v1/checkout/sessions' })
		.reply(200, (opts: any) => {
			const params = new URLSearchParams(String(opts.body ?? ''));
			sent.sessions.push(params);
			return { url: `https://checkout.stripe.com/c/pay/test_${sent.sessions.length}` };
		})
		.times(times);
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(() => {
	sent.sessions.length = 0;
	fetchMock.assertNoPendingInterceptors();
	vi.useRealTimers();
});

describe('POST /api/checkout', () => {
	it('rejects an unknown kind', async () => {
		const { status, body } = await checkout({ kind: 'weekly' });
		expect(status).toBe(400);
		expect(body.error).toBe('Unknown kind');
	});

	it('defaults to kind=class when omitted, and returns a checkout url for a future date', async () => {
		interceptPrices();
		interceptSessions();

		const { status, body } = await checkout({ event_date: '2026-11-20' });

		expect(status).toBe(200);
		expect(body.url).toBe('https://checkout.stripe.com/c/pay/test_1');
		expect(sent.sessions).toHaveLength(1);
		const params = sent.sessions[0];
		expect(params.get('mode')).toBe('payment');
		expect(params.get('line_items[0][price]')).toBe(PRICES['ci-class-sliding'].id);
		expect(params.get('line_items[0][quantity]')).toBe('1');
		// custom_unit_amount ($20-40): Stripe refuses promotion codes on it
		expect(params.has('allow_promotion_codes')).toBe(false);
		expect(params.get('metadata[class_date]')).toBe('2026-11-20');
		expect(params.get('metadata[kind]')).toBe('class');
		expect(params.get('metadata[product]')).toBe('ci-class');
		expect(params.get('success_url')).toContain('kind=class&event_date=2026-11-20&ticket_type=early');
		expect(params.get('success_url')).not.toContain('amount=');
	});

	it('answers 409 with a door link once a ticket date is past its cutoff', async () => {
		// Move the clock past every class's 2-hour-before cutoff so the Oct 2
		// class (the earliest) reads as closed, without touching real wall time
		// anywhere resolveEvent itself depends on (it never reads the clock).
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-02T18:00:00-04:00'));

		const { status, body } = await checkout({ kind: 'class', event_date: '2026-10-02' });

		expect(status).toBe(409);
		expect(body).toEqual({ closed: true, door_url: 'https://miamicontactimprov.com/pay' });
	});

	it('answers 409 (kind unavailable) for jam, since no jam date exists in EVENTS yet', async () => {
		const { status, body } = await checkout({ kind: 'jam' });
		expect(status).toBe(409);
		expect(body).toEqual({ closed: true, door_url: 'https://miamicontactimprov.com/pay' });
	});

	it('answers 409 (kind unavailable) for combo, since no combo-capable date exists in EVENTS yet', async () => {
		const { status, body } = await checkout({ kind: 'combo' });
		expect(status).toBe(409);
		expect(body).toEqual({ closed: true, door_url: 'https://miamicontactimprov.com/pay' });
	});

	it('answers 400 (unknown date) for a date not in EVENTS at all', async () => {
		const { status, body } = await checkout({ kind: 'class', event_date: '2099-01-01' });
		expect(status).toBe(400);
		expect(body.error).toBe('Unknown class date');
	});

	it('returns 500 when STRIPE_SECRET_KEY is not configured', async () => {
		const { status, body } = await checkout({ kind: 'class', event_date: '2026-11-20' }, testEnv({ STRIPE_SECRET_KEY: undefined }));
		expect(status).toBe(500);
		expect(body.error).toBe('Stripe not configured');
	});

	it('returns 500 when the lookup key has no matching Stripe price', async () => {
		fetchMock
			.get(STRIPE_ORIGIN)
			.intercept({ method: 'GET', path: /\/v1\/prices\?/ })
			.reply(200, { data: [] });

		const { status, body } = await checkout({ kind: 'class', event_date: '2026-11-20' });
		expect(status).toBe(500);
		expect(body.error).toBe('Price not configured');
	});
});
