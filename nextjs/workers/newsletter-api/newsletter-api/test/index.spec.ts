import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';

const ADMIN_TOKEN = 'test-admin-token';
const RESEND_ORIGIN = 'https://api.resend.com';
const AUDIENCE = 'aud_test';
const STRIPE_ORIGIN = 'https://api.stripe.com';
const META_ORIGIN = 'https://graph.facebook.com';
const PIXEL_ID = '1234567890';
const EVENT_HEADERS = {
	'Content-Type': 'application/json',
	Authorization: `Bearer ${ADMIN_TOKEN}`,
};
// shasum -a 256 of reader@example.com. Written out rather than recomputed here so
// the test proves the worker hashes the way Meta's documentation says and not
// merely in a way that agrees with itself.
const READER_HASH = 'd108b279434fe1d54ac0f1da633564604b26c2e0e221d108b0fbadb87aba02c0';

// Same shape as production, with throwaway values. No real code or key here.
function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, {
		ADMIN_TOKEN,
		RESEND_API_KEY: 're_test_key',
		RESEND_AUDIENCE_ID: AUDIENCE,
		CI_ONE_EVENT_COUPON_ID: 'coupon_test10',
		STRIPE_SECRET_KEY: 'sk_test_placeholder',
	}, overrides) as unknown as Env;
}

async function call(
	path: string,
	init: RequestInit = {},
	requestEnv: Env = testEnv()
): Promise<{ status: number; body: any }> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(new Request(`https://newsletter.test${path}`, init), requestEnv, ctx);
	await waitOnExecutionContext(ctx);
	const text = await response.text();
	return { status: response.status, body: text ? JSON.parse(text) : null };
}

function subscribe(email: string, source: string) {
	return call('/api/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, consent: true, source }),
	});
}

// Interceptors record the payloads they were called with, so a test can assert
// on what the worker actually sent to Resend.
const sent: { contacts: any[]; emails: any[]; stripe: Array<{ body: string; headers: Record<string, string> }>; meta: { body: any; path: string }[] } = {
	contacts: [],
	stripe: [],
	emails: [],
	meta: [],
};

function interceptContacts(status = 201, times = 1) {
	fetchMock
		.get(RESEND_ORIGIN)
		.intercept({ method: 'POST', path: `/audiences/${AUDIENCE}/contacts` })
		.reply(status, (opts: any) => {
			sent.contacts.push(JSON.parse(String(opts.body ?? '{}')));
			return { id: `contact_${sent.contacts.length}` };
		})
		.times(times);
}

function interceptPromo(status = 200, times = 1) {
	fetchMock
		.get(STRIPE_ORIGIN)
		.intercept({ method: 'POST', path: '/v1/promotion_codes' })
		.reply(status, (opts: any) => {
			const body = String(opts.body ?? '');
			sent.stripe.push({ body, headers: opts.headers ?? {} });
			const code = new URLSearchParams(body).get('code');
			return status === 200 ? { id: 'promo_1', code } : { error: { message: 'boom' } };
		})
		.times(times);
}

function interceptEmails(status = 200, times = 1) {
	fetchMock
		.get(RESEND_ORIGIN)
		.intercept({ method: 'POST', path: '/emails' })
		.reply(status, (opts: any) => {
			sent.emails.push(JSON.parse(String(opts.body ?? '{}')));
			return { id: `email_${sent.emails.length}` };
		})
		.times(times);
}

// The pixel URL carries its version and the token in the query string, so the
// interceptor matches on a pattern and the test reads the path back.
function interceptMeta(status = 200, times = 1) {
	fetchMock
		.get(META_ORIGIN)
		.intercept({ method: 'POST', path: new RegExp(`/v23\\.0/${PIXEL_ID}/events\\?`) })
		.reply(status, (opts: any) => {
			sent.meta.push({ body: JSON.parse(String(opts.body ?? '{}')), path: String(opts.path ?? '') });
			return status === 200 ? { events_received: 1 } : { error: { message: 'Invalid parameter' } };
		})
		.times(times);
}

function postEvent(payload: Record<string, unknown>, requestEnv: Env = testEnv()) {
	return call(
		'/api/events',
		{
			method: 'POST',
			headers: EVENT_HEADERS,
			body: JSON.stringify(payload),
		},
		requestEnv
	);
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(async () => {
	for (const k of (await env.EMAIL_SUBS.list()).keys) await env.EMAIL_SUBS.delete(k.name);
	sent.contacts.length = 0;
	sent.emails.length = 0;
	sent.stripe.length = 0;
	sent.meta.length = 0;
	fetchMock.assertNoPendingInterceptors();
});

describe('admin endpoints', () => {
	it('rejects /api/list with no Authorization header', async () => {
		const { status, body } = await call('/api/list');
		expect(status).toBe(401);
		expect(body.error).toBe('Unauthorized');
	});

	it('rejects /api/list with the wrong token', async () => {
		const { status } = await call('/api/list', { headers: { Authorization: 'Bearer nope' } });
		expect(status).toBe(401);
	});

	it('rejects /api/list when no token is configured', async () => {
		const { status } = await call('/api/list', { headers: { Authorization: 'Bearer anything' } },
			testEnv({ ADMIN_TOKEN: undefined }));
		expect(status).toBe(401);
	});

	it('serves /api/list with the right token', async () => {
		const { status, body } = await call('/api/list', { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
		expect(status).toBe(200);
		expect(Array.isArray(body.keys)).toBe(true);
		expect(body.count).toBe(body.keys.length);
	});

	it('rejects /api/get/<email> without a token', async () => {
		const { status } = await call('/api/get/reader@example.com');
		expect(status).toBe(401);
	});

	it('serves /api/get/<email> with the right token', async () => {
		await env.EMAIL_SUBS.put('reader@example.com', JSON.stringify({ email: 'reader@example.com', source: 'test' }));
		const { status, body } = await call('/api/get/reader@example.com', {
			headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
		});
		expect(status).toBe(200);
		expect(body.data.email).toBe('reader@example.com');
	});
});

describe('POST /api/subscribe', () => {
	it('rejects a malformed email', async () => {
		const { status, body } = await subscribe('not-an-email', 'maxpetrusenko.com:footer');
		expect(status).toBe(400);
		expect(body.error).toBe('Invalid email');
	});

	it('rejects a subscribe without consent', async () => {
		const { status } = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'reader@example.com', consent: false }),
		});
		expect(status).toBe(400);
	});

	it('stores a maxpetrusenko.com subscriber in KV and mirrors it to Resend, with no welcome email', async () => {
		interceptContacts();

		const { status } = await subscribe('reader@example.com', 'maxpetrusenko.com:footer');

		expect(status).toBe(200);
		expect(sent.contacts).toHaveLength(1);
		expect(sent.emails).toHaveLength(0);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored.source).toBe('maxpetrusenko.com:footer');
	});

	it('sends the welcome email once for a contact improv subscriber', async () => {
		interceptContacts(201, 2);
		interceptPromo();
		interceptEmails();

		expect((await subscribe('reader@example.com', 'miamicontactimprov:fundamentals')).status).toBe(200);
		// A second signup from the same site must not send a second welcome.
		expect((await subscribe('reader@example.com', 'miamicontactimprov:es')).status).toBe(200);

		expect(sent.contacts).toHaveLength(2);
		expect(sent.emails).toHaveLength(1);

		const mail = sent.emails[0];
		expect(mail.from).toBe('Contact Improv Miami <hello@miamicontactimprov.com>');
		expect(mail.to).toEqual(['reader@example.com']);
		expect(sent.stripe).toHaveLength(1);
		const promo = new URLSearchParams(sent.stripe[0].body);
		expect(promo.get('promotion[type]')).toBe('coupon');
		expect(promo.get('promotion[coupon]')).toBe('coupon_test10');
		expect(promo.get('max_redemptions')).toBe('1');
		expect(promo.get('code')).toMatch(/^CI10-[A-Z0-9]{6}$/);
		expect(mail.subject).toBe('Your 10% off one event');
		expect(mail.text).toContain(promo.get('code'));
		expect(mail.text).toContain('10% off one event');
		expect(mail.text).not.toMatch(/20%|two months|—|–/);
		expect(mail.text).toContain('https://miamicontactimprov.com/fundamentals');
		expect(mail.text.match(/https?:\/\//g) ?? []).toHaveLength(1);
		expect(mail.text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(120);
	});

	it('sends the exact Stripe form body and headers', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();
		const before = Math.floor(Date.now() / 1000);

		await subscribe('reader@example.com', 'miamicontactimprov:start');

		const { body, headers } = sent.stripe[0];
		const params = new URLSearchParams(body);
		expect([...params.keys()].sort()).toEqual(
			['code', 'expires_at', 'max_redemptions', 'promotion[coupon]', 'promotion[type]'],
		);
		const expires = Number(params.get('expires_at'));
		expect(expires - before).toBeGreaterThanOrEqual(60 * 86400);
		expect(expires - before).toBeLessThan(60 * 86400 + 60);
		const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
		expect(lower['stripe-version']).toBe('2025-09-30.clover');
		expect(lower['idempotency-key']).toMatch(/^ci10-[0-9a-f]{64}-1$/);
		expect(lower['content-type']).toBe('application/x-www-form-urlencoded');
	});

	it('gives aliases of one gmail mailbox a single code', async () => {
		interceptContacts(201, 2);
		interceptPromo();
		interceptEmails();

		await subscribe('first.last+a@gmail.com', 'miamicontactimprov:start');
		await subscribe('firstlast@googlemail.com', 'miamicontactimprov:start');

		expect(sent.stripe).toHaveLength(1);
		expect(sent.emails).toHaveLength(1);
		await env.EMAIL_SUBS.delete('first.last+a@gmail.com');
		await env.EMAIL_SUBS.delete('firstlast@googlemail.com');
	});

	it('retries only the email, with the same code, after Resend fails', async () => {
		interceptContacts(201, 2);
		interceptPromo();
		interceptEmails(500);
		interceptEmails(200);

		await subscribe('reader@example.com', 'miamicontactimprov:start');
		expect(sent.emails).toHaveLength(1);
		const code = new URLSearchParams(sent.stripe[0].body).get('code');
		await subscribe('reader@example.com', 'miamicontactimprov:start');

		expect(sent.stripe).toHaveLength(1);
		expect(sent.emails).toHaveLength(2);
		expect(sent.emails[1].text).toContain(code);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored.promo_code).toBe(code);
		expect(stored.welcome_sent_at).toBeGreaterThan(0);
	});

	it('uses a fresh idempotency key after Stripe refuses, on the next signup', async () => {
		interceptContacts(201, 2);
		interceptPromo(400);
		interceptPromo();
		interceptEmails();

		await subscribe('reader@example.com', 'miamicontactimprov:start');
		expect(sent.emails).toHaveLength(0);
		await subscribe('reader@example.com', 'miamicontactimprov:start');

		expect(sent.stripe).toHaveLength(2);
		expect(sent.emails).toHaveLength(1);
		const keys = sent.stripe.map((r) => Object.entries(r.headers).find(([k]) => k.toLowerCase() === 'idempotency-key')?.[1]);
		expect(keys[0]).toMatch(/-1$/);
		expect(keys[1]).toMatch(/-2$/);
	});

	it('skips the welcome email when Stripe refuses to create the code', async () => {
		interceptContacts();
		interceptPromo(400);

		expect((await subscribe('reader@example.com', 'miamicontactimprov:start')).status).toBe(200);
		expect(sent.emails).toHaveLength(0);
	});

	it('skips the welcome email when the coupon id is not set', async () => {
		interceptContacts();

		const { status } = await call(
			'/api/subscribe',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'reader@example.com', consent: true, source: 'miamicontactimprov:start' }),
			},
			testEnv({ CI_ONE_EVENT_COUPON_ID: undefined }),
		);
		expect(status).toBe(200);
		expect(sent.stripe).toHaveLength(0);
		expect(sent.emails).toHaveLength(0);
	});

	it('keeps serving the subscriber when Resend fails', async () => {
		interceptContacts(500);

		const { status, body } = await subscribe('reader@example.com', 'maxpetrusenko.com:footer');
		expect(status).toBe(200);
		expect(body.ok).toBe(true);
	});

	it('stores the acquisition fields a page sends with a signup', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();

		const { status } = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'reader@example.com',
				consent: true,
				source: 'miamicontactimprov:start:door',
				offer: 'Not ready for this Friday? Get the next dates and 10% off one event.',
				campaign: 'ci-october',
				landing_page: '/start',
				referrer: 'https://www.instagram.com/',
				utm_source: 'instagram',
				utm_medium: 'bio',
				utm_content: 'link-in-bio',
				something_else: 'ignored',
			}),
		});

		expect(status).toBe(200);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored.source).toBe('miamicontactimprov:start:door');
		expect(stored.offer).toBe('Not ready for this Friday? Get the next dates and 10% off one event.');
		expect(stored.campaign).toBe('ci-october');
		expect(stored.landing_page).toBe('/start');
		expect(stored.referrer).toBe('https://www.instagram.com/');
		expect(stored.utm_source).toBe('instagram');
		expect(stored.utm_medium).toBe('bio');
		expect(stored.utm_content).toBe('link-in-bio');
		expect(stored.something_else).toBeUndefined();
		// The fields travel with the signup and change nothing else about it.
		expect(sent.contacts).toHaveLength(1);
		expect(sent.emails).toHaveLength(1);
	});

	it('stores a signup from a page that sends no acquisition fields', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();

		expect((await subscribe('reader@example.com', 'miamicontactimprov:fundamentals')).status).toBe(200);

		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		// promo_code and welcome_sent_at are the welcome state mirrored onto the record.
		expect(Object.keys(stored).sort()).toEqual(['consent', 'email', 'promo_code', 'source', 'ts', 'welcome_sent_at']);
	});

	it('cuts an overlong field and drops the empty and the untexted ones', async () => {
		interceptContacts();

		const { status } = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'reader@example.com',
				consent: true,
				source: 'maxpetrusenko.com:footer',
				campaign: 'c'.repeat(500),
				referrer: 42,
				offer: '   ',
			}),
		});

		expect(status).toBe(200);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored.campaign).toHaveLength(80);
		expect(stored.referrer).toBeUndefined();
		expect(stored.offer).toBeUndefined();
	});

	it('stores a phone number when one is given', async () => {
		interceptContacts();

		const { status } = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'reader@example.com',
				consent: true,
				source: 'maxpetrusenko.com:footer',
				phone: '(305) 555-0134',
			}),
		});

		expect(status).toBe(200);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored.phone).toBe('(305) 555-0134');
	});

	it('rejects a phone number that is not enough digits to be one', async () => {
		const { status, body } = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'reader@example.com', consent: true, phone: '555' }),
		});

		expect(status).toBe(400);
		expect(body.error).toBe('Invalid phone');
	});

	it('leaves phone out of the record when the field is left blank', async () => {
		interceptContacts();

		const { status } = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'reader@example.com', consent: true, source: 'maxpetrusenko.com:footer' }),
		});

		expect(status).toBe(200);
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored.phone).toBeUndefined();
	});

	it('answers ok without storing or mailing a submission that fills the honeypot', async () => {
		const { status, body } = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'bot@example.com',
				consent: true,
				source: 'miamicontactimprov:fundamentals',
				company: 'Acme Ltd',
			}),
		});

		expect(status).toBe(200);
		expect(body.ok).toBe(true);
		expect(await env.EMAIL_SUBS.get('bot@example.com')).toBeNull();
		expect(sent.contacts).toHaveLength(0);
		expect(sent.emails).toHaveLength(0);
	});
});

describe('POST /api/events', () => {
	const pixelEnv = { META_PIXEL_ID: PIXEL_ID, META_CAPI_TOKEN: 'test-capi-token' };

	it('rejects an event with no Authorization header', async () => {
		const { status, body } = await call('/api/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ event: 'Lead', email: 'reader@example.com' }),
		});
		expect(status).toBe(401);
		expect(body.error).toBe('Unauthorized');
	});

	it('rejects an event name the pixel does not know, and says which ones it does', async () => {
		const { status, body } = await postEvent({ event: 'Purchase', email: 'reader@example.com' });
		expect(status).toBe(400);
		expect(body.error).toContain('Lead, CompleteRegistration, Attend');
	});

	it('rejects a malformed address', async () => {
		const { status, body } = await postEvent({ event: 'Lead', email: 'not-an-email' });
		expect(status).toBe(400);
		expect(body.error).toBe('Invalid email');
	});

	it('logs and answers 202 while the pixel secrets are missing', async () => {
		const logged = vi.spyOn(console, 'log').mockImplementation(() => {});

		const { status, body } = await postEvent({ event: 'Lead', email: 'reader@example.com' });

		expect(status).toBe(202);
		expect(body).toEqual({ ok: true, event: 'Lead', forwarded: false });
		expect(logged).toHaveBeenCalledWith(
			'[Meta CAPI skipped]',
			expect.objectContaining({
				event: 'Lead',
				reason: expect.stringContaining('META_PIXEL_ID'),
			})
		);
		// No interceptor is registered for this test, and assertNoPendingInterceptors
		// runs after it: reaching Meta at all would fail here.
		logged.mockRestore();
	});

	it('sends a check-in to the pixel as a hashed address and nothing readable', async () => {
		interceptMeta();

		const { status, body } = await postEvent({ event: 'Attend', email: '  Reader@Example.COM ' }, testEnv(pixelEnv));
		expect(status).toBe(202);
		expect(body).toEqual({ ok: true, event: 'Attend', forwarded: true });

		expect(sent.meta).toHaveLength(1);
		const entry = sent.meta[0].body.data[0];
		expect(entry.event_name).toBe('Attend');
		expect(entry.action_source).toBe('website');
		// The address arrives in whatever case and spacing the caller had, and Meta
		// only matches the trimmed and lowercased form.
		expect(entry.user_data).toEqual({ em: [READER_HASH] });
		expect(Math.abs(entry.event_time - Math.floor(Date.now() / 1000))).toBeLessThan(10);
		expect(entry.event_id.startsWith('Attend:')).toBe(true);
		expect(entry.custom_data).toBeUndefined();
		expect(sent.meta[0].path).toContain(`/v23.0/${PIXEL_ID}/events`);
		expect(sent.meta[0].path).toContain('access_token=test-capi-token');
		// Nothing in the payload that leaves the Worker spells the address out.
		expect(JSON.stringify(sent.meta[0].body)).not.toContain('reader@example.com');
	});

	it('carries a value and a currency when the caller sends one', async () => {
		interceptMeta();

		await postEvent({ event: 'CompleteRegistration', email: 'reader@example.com', value: 20, currency: 'usd' }, testEnv(pixelEnv));

		expect(sent.meta[0].body.data[0].custom_data).toEqual({ value: 20, currency: 'USD' });
	});

	it("keeps the caller's event id so a retried import is not counted twice", async () => {
		interceptMeta();

		await postEvent({ event: 'Lead', email: 'reader@example.com', event_id: 'import-2026-09-21-014' }, testEnv(pixelEnv));

		expect(sent.meta[0].body.data[0].event_id).toBe('import-2026-09-21-014');
	});

	it('sends a device address only when the caller says it came off the device', async () => {
		interceptMeta();

		await postEvent({
			event: 'Attend',
			email: 'reader@example.com',
			client_ip_address: '203.0.113.7',
			client_user_agent: 'Mozilla/5.0',
		}, testEnv(pixelEnv));

		expect(sent.meta[0].body.data[0].user_data).toEqual({
			em: [READER_HASH],
			client_ip_address: ['203.0.113.7'],
			client_user_agent: ['Mozilla/5.0'],
		});
	});

	it('names the test event code when one is configured, so a dry run stays out of the numbers', async () => {
		interceptMeta();

		await postEvent({ event: 'Lead', email: 'reader@example.com' }, testEnv({ ...pixelEnv, META_TEST_EVENT_CODE: 'TEST12345' }));

		expect(sent.meta[0].path).toContain('test_event_code=TEST12345');
	});

	it("keeps the caller's flow when the pixel refuses the event", async () => {
		interceptMeta(500);
		const errored = vi.spyOn(console, 'error').mockImplementation(() => {});

		const { status, body } = await postEvent({ event: 'Lead', email: 'reader@example.com' }, testEnv(pixelEnv));

		expect(status).toBe(202);
		expect(body).toEqual({ ok: true, event: 'Lead', forwarded: false });
		expect(errored).toHaveBeenCalledWith('[Meta CAPI rejected]', 'Lead', 500, expect.stringContaining('Invalid parameter'));
		errored.mockRestore();
	});
});
