import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from '../src';
import { normalizeReferrer, cleanHandle } from '../src/tickets';

const STRIPE_ORIGIN = 'https://api.stripe.com';
const STRIPE_SECRET_KEY = 'sk_test_fake_for_tests';

const PRICES: Record<string, { id: string; unit_amount: number }> = {
	'ci-ticket-online-friday': { id: 'price_class_test', unit_amount: 2000 },
	'ci-class-15': { id: 'price_class15_test', unit_amount: 1500 },
};

function testEnv(): Env {
	return Object.assign({}, env, { STRIPE_SECRET_KEY, RESEND_API_KEY: undefined }) as unknown as Env;
}

async function post(path: string, payload: Record<string, unknown>): Promise<{ status: number; body: any }> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(
		new Request(`https://newsletter.test${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}),
		testEnv(),
		ctx,
	);
	await waitOnExecutionContext(ctx);
	const text = await response.text();
	return { status: response.status, body: text ? JSON.parse(text) : null };
}

const sent: { sessions: URLSearchParams[]; lookups: URL[] } = { sessions: [], lookups: [] };

function interceptPrice() {
	fetchMock
		.get(STRIPE_ORIGIN)
		.intercept({ method: 'GET', path: /\/v1\/prices\?/ })
		.reply(200, (opts: any) => {
			const url = new URL(String(opts.path), STRIPE_ORIGIN);
			const price = PRICES[url.searchParams.get('lookup_keys[]') ?? ''];
			return { data: price ? [price] : [] };
		});
}

function interceptSession() {
	fetchMock
		.get(STRIPE_ORIGIN)
		.intercept({ method: 'POST', path: '/v1/checkout/sessions' })
		.reply(200, (opts: any) => {
			sent.sessions.push(new URLSearchParams(String(opts.body ?? '')));
			return { url: `https://checkout.stripe.com/c/pay/test_${sent.sessions.length}` };
		});
}

// GET /v1/checkout/sessions: the "has this email already paid" lookup.
function interceptPastSessions(sessions: Array<{ metadata: Record<string, string> }>, times = 1) {
	fetchMock
		.get(STRIPE_ORIGIN)
		.intercept({ method: 'GET', path: /\/v1\/checkout\/sessions\?/ })
		.reply(200, (opts: any) => {
			sent.lookups.push(new URL(String(opts.path), STRIPE_ORIGIN));
			return { data: sessions };
		})
		.times(times);
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(() => {
	sent.sessions.length = 0;
	sent.lookups.length = 0;
	fetchMock.assertNoPendingInterceptors();
});

const DATE = '2026-11-20';

describe('ticket_type on POST /api/checkout', () => {
	it('early is the default: $20, promo codes on, metadata on session and payment intent', async () => {
		interceptPrice();
		interceptSession();
		const { status } = await post('/api/checkout', { event_date: DATE });
		expect(status).toBe(200);
		const p = sent.sessions[0];
		expect(p.get('line_items[0][price]')).toBe('price_class_test');
		expect(p.get('allow_promotion_codes')).toBe('true');
		expect(p.get('metadata[ticket_type]')).toBe('early');
		expect(p.get('metadata[event]')).toBe(DATE);
		expect(p.get('payment_intent_data[metadata][ticket_type]')).toBe('early');
		// empty fields are not sent at all
		expect(p.has('metadata[referrer]')).toBe(false);
		expect(p.get('success_url')).toContain('ticket_type=early');
	});

	it('community needs a channel and a handle', async () => {
		expect((await post('/api/checkout', { ticket_type: 'community', event_date: DATE })).status).toBe(400);
		const noHandle = await post('/api/checkout', { ticket_type: 'community', share_channel: 'whatsapp_group', event_date: DATE });
		expect(noHandle.status).toBe(400);
		expect(noHandle.body.error).toBe('Add your handle or the group name');
		const badChannel = await post('/api/checkout', { ticket_type: 'community', share_channel: 'tiktok', handle: 'x', event_date: DATE });
		expect(badChannel.status).toBe(400);
	});

	it('community: $15, no promo codes, channel and handle in metadata', async () => {
		interceptPrice();
		interceptSession();
		const { status, body } = await post('/api/checkout', {
			ticket_type: 'community',
			share_channel: 'instagram_story',
			handle: '  @dancer.mia  ',
			event_date: DATE,
		});
		expect(status).toBe(200);
		expect(body.url).toContain('checkout.stripe.com');
		const p = sent.sessions[0];
		expect(p.get('line_items[0][price]')).toBe('price_class15_test');
		expect(p.has('allow_promotion_codes')).toBe(false);
		expect(p.get('metadata[ticket_type]')).toBe('community');
		expect(p.get('metadata[share_channel]')).toBe('instagram_story');
		expect(p.get('metadata[handle]')).toBe('@dancer.mia');
		expect(p.get('cancel_url')).toBe('https://miamicontactimprov.com/tickets');
	});

	it('referral: $15 with the referrer in metadata; a malformed name is refused', async () => {
		expect((await post('/api/checkout', { ticket_type: 'referral', referrer: '../admin', event_date: DATE })).status).toBe(400);
		interceptPrice();
		interceptSession();
		const { status } = await post('/api/checkout', { ticket_type: 'referral', referrer: 'Max', event_date: DATE });
		expect(status).toBe(200);
		const p = sent.sessions[0];
		expect(p.get('line_items[0][price]')).toBe('price_class15_test');
		expect(p.get('metadata[referrer]')).toBe('max');
		expect(p.get('payment_intent_data[metadata][referrer]')).toBe('max');
		expect(p.has('allow_promotion_codes')).toBe(false);
	});

	it('$15 offers are class-only in this slice', async () => {
		const { status, body } = await post('/api/checkout', { kind: 'jam', ticket_type: 'referral', referrer: 'max' });
		expect(status).toBe(400);
		expect(body.error).toBe('Ticket type not available for this kind');
	});

	it('rejects an unknown ticket type', async () => {
		const { status, body } = await post('/api/checkout', { ticket_type: 'vip', event_date: DATE });
		expect(status).toBe(400);
		expect(body.error).toBe('Unknown ticket type');
	});
});

describe('first-class $15 offer', () => {
	it('checkout refuses the first-class price for an email that never claimed the offer', async () => {
		const { status, body } = await post('/api/checkout', { ticket_type: 'first', email: 'new@example.com', event_date: DATE });
		expect(status).toBe(403);
		expect(body.error).toBe('first_offer_not_issued');
	});

	it('capture, then checkout: $15, email locked, first_discount in metadata', async () => {
		interceptPastSessions([]);
		const capture = await post('/api/first-class', { email: 'New@Example.com ', consent: true });
		expect(capture).toEqual({ status: 200, body: { ok: true, eligible: true } });
		expect(sent.lookups[0].searchParams.get('customer_details[email]')).toBe('new@example.com');
		expect(sent.lookups[0].searchParams.get('status')).toBe('complete');

		const stored = JSON.parse((await env.EMAIL_SUBS.get('new@example.com')) ?? '{}');
		expect(stored.first_offer_issued_at).toBeTypeOf('number');
		expect(stored.first_discount_claimed).toBe(false);

		interceptPastSessions([]);
		interceptPrice();
		interceptSession();
		const { status } = await post('/api/checkout', { ticket_type: 'first', email: 'new@example.com', event_date: DATE });
		expect(status).toBe(200);
		const p = sent.sessions[0];
		expect(p.get('customer_email')).toBe('new@example.com');
		expect(p.get('metadata[ticket_type]')).toBe('first');
		expect(p.get('metadata[first_discount]')).toBe('true');
		expect(p.has('allow_promotion_codes')).toBe(false);
	});

	it('a past paid CI checkout closes the offer, and the KV flag caches it', async () => {
		interceptPastSessions([{ metadata: { product: 'ci-class', ticket_type: 'early' } }]);
		const capture = await post('/api/first-class', { email: 'back@example.com', consent: true });
		expect(capture.body).toEqual({ ok: true, eligible: false, reason: 'first_discount_claimed' });
		const stored = JSON.parse((await env.EMAIL_SUBS.get('back@example.com')) ?? '{}');
		expect(stored.first_discount_claimed).toBe(true);

		// No Stripe lookup this time: the cached flag answers.
		const { status, body } = await post('/api/checkout', { ticket_type: 'first', email: 'back@example.com', event_date: DATE });
		expect(status).toBe(409);
		expect(body.error).toBe('first_discount_claimed');
	});

	it('a non-CI purchase on the shared Stripe account does not close the offer', async () => {
		interceptPastSessions([{ metadata: { product: 'blindfolded-retreat' } }]);
		const capture = await post('/api/first-class', { email: 'other@example.com', consent: true });
		expect(capture.body).toEqual({ ok: true, eligible: true });
	});

	it('keeps an existing subscriber record intact when the offer is issued', async () => {
		await env.EMAIL_SUBS.put('sub@example.com', JSON.stringify({ email: 'sub@example.com', source: 'miamicontactimprov-home', phone: '+1 305 555 0100' }));
		interceptPastSessions([]);
		await post('/api/first-class', { email: 'sub@example.com', consent: true });
		const stored = JSON.parse((await env.EMAIL_SUBS.get('sub@example.com')) ?? '{}');
		expect(stored.source).toBe('miamicontactimprov-home');
		expect(stored.phone).toBe('+1 305 555 0100');
		expect(stored.first_offer_issued_at).toBeTypeOf('number');
	});

	it('requires consent and a valid email; the honeypot stores nothing', async () => {
		expect((await post('/api/first-class', { email: 'a@example.com' })).status).toBe(400);
		expect((await post('/api/first-class', { email: 'nope', consent: true })).status).toBe(400);
		const bot = await post('/api/first-class', { email: 'bot@example.com', consent: true, company: 'Acme' });
		expect(bot.status).toBe(200);
		expect(await env.EMAIL_SUBS.get('bot@example.com')).toBeNull();
	});

	it('fails closed when Stripe cannot answer', async () => {
		fetchMock
			.get(STRIPE_ORIGIN)
			.intercept({ method: 'GET', path: /\/v1\/checkout\/sessions\?/ })
			.reply(500, { error: { message: 'down' } });
		const { status } = await post('/api/first-class', { email: 'flaky@example.com', consent: true });
		expect(status).toBe(502);
	});
});

describe('input helpers', () => {
	it('normalizeReferrer accepts slugs only', () => {
		expect(normalizeReferrer('Max')).toBe('max');
		expect(normalizeReferrer('ana-lu')).toBe('ana-lu');
		expect(normalizeReferrer('-x')).toBeNull();
		expect(normalizeReferrer('a b')).toBeNull();
		expect(normalizeReferrer('a'.repeat(41))).toBeNull();
		expect(normalizeReferrer(42)).toBeNull();
	});

	it('cleanHandle trims, strips control characters and caps length', () => {
		expect(cleanHandle(' @me\n ')).toBe('@me');
		expect(cleanHandle('x'.repeat(200))).toHaveLength(80);
		expect(cleanHandle(undefined)).toBe('');
	});
});
