import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';

const STRIPE_ORIGIN = 'https://api.stripe.com';
const STRIPE_SECRET_KEY = 'sk_test_fake_key_for_vitest';

const PRICE_IDS: Record<string, string> = {
	'ci-ticket-online-friday': 'price_ticket_test',
	'ci-intro-pack': 'price_intro_test',
	'ci-membership-monthly': 'price_monthly_test',
	'ci-membership-annual': 'price_annual_test',
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
			const priceId = PRICE_IDS[lookupKey];
			return { data: priceId ? [{ id: priceId }] : [] };
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
	it('rejects an unknown plan', async () => {
		const { status, body } = await checkout({ plan: 'weekly' });
		expect(status).toBe(400);
		expect(body.error).toBe('Unknown plan');
	});

	it('returns a checkout url for a ticket on a future date, with mode=payment and the right price', async () => {
		interceptPrices();
		interceptSessions();

		const { status, body } = await checkout({ plan: 'ticket', date: '2026-11-20' });

		expect(status).toBe(200);
		expect(body.url).toBe('https://checkout.stripe.com/c/pay/test_1');
		expect(sent.sessions).toHaveLength(1);
		const params = sent.sessions[0];
		expect(params.get('mode')).toBe('payment');
		expect(params.get('line_items[0][price]')).toBe(PRICE_IDS['ci-ticket-online-friday']);
		expect(params.get('line_items[0][quantity]')).toBe('1');
		expect(params.get('allow_promotion_codes')).toBe('true');
		expect(params.get('metadata[class_date]')).toBe('2026-11-20');
		expect(params.get('metadata[plan]')).toBe('ticket');
		expect(params.get('success_url')).toContain('plan=ticket&date=2026-11-20');
	});

	it('answers 409 with a door link once a ticket date is past its cutoff', async () => {
		// Move the clock past every class's 2-hour-before cutoff so the Oct 2
		// class (the earliest) reads as closed, without touching real wall time
		// anywhere resolveTicketEvent itself depends on (it never reads the clock).
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-02T18:00:00-04:00'));

		const { status, body } = await checkout({ plan: 'ticket', date: '2026-10-02' });

		expect(status).toBe(409);
		expect(body).toEqual({ closed: true, door_url: 'https://miamicontactimprov.com/pay' });
	});

	it('returns a checkout url for monthly, with mode=subscription and no allow_promotion_codes field', async () => {
		interceptPrices();
		interceptSessions();

		const { status, body } = await checkout({ plan: 'monthly' });

		expect(status).toBe(200);
		expect(body.url).toContain('https://checkout.stripe.com/');
		const params = sent.sessions[0];
		expect(params.get('mode')).toBe('subscription');
		expect(params.get('line_items[0][price]')).toBe(PRICE_IDS['ci-membership-monthly']);
		expect(params.has('allow_promotion_codes')).toBe(false);
		expect(params.get('metadata[plan]')).toBe('monthly');
	});

	it('returns a checkout url for intro, with mode=payment and allow_promotion_codes', async () => {
		interceptPrices();
		interceptSessions();

		const { status, body } = await checkout({ plan: 'intro' });

		expect(status).toBe(200);
		expect(body.url).toContain('https://checkout.stripe.com/');
		const params = sent.sessions[0];
		expect(params.get('mode')).toBe('payment');
		expect(params.get('line_items[0][price]')).toBe(PRICE_IDS['ci-intro-pack']);
		expect(params.get('allow_promotion_codes')).toBe('true');
	});

	it('returns 500 when STRIPE_SECRET_KEY is not configured', async () => {
		const { status, body } = await checkout({ plan: 'monthly' }, testEnv({ STRIPE_SECRET_KEY: undefined }));
		expect(status).toBe(500);
		expect(body.error).toBe('Stripe not configured');
	});

	it('returns 500 when the lookup key has no matching Stripe price', async () => {
		fetchMock
			.get(STRIPE_ORIGIN)
			.intercept({ method: 'GET', path: /\/v1\/prices\?/ })
			.reply(200, { data: [] });

		const { status, body } = await checkout({ plan: 'monthly' });
		expect(status).toBe(500);
		expect(body.error).toBe('Price not configured');
	});
});
