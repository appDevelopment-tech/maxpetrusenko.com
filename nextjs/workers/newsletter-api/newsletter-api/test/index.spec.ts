import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker, { normalizeEmail } from '../src';
import { toE164, smsBody } from '../src/sms';
import { signConfirmation } from '../src/resubscribe';

const ADMIN_TOKEN = 'test-admin-token';
const RESEND_ORIGIN = 'https://api.resend.com';
const AUDIENCE = 'aud_test';
const STRIPE_ORIGIN = 'https://api.stripe.com';
const TWILIO_ORIGIN = 'https://api.twilio.com';
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
		TWILIO_ACCOUNT_SID: 'ACtest',
		TWILIO_AUTH_TOKEN: 'twilio_token_test',
		TWILIO_FROM: '+18335550100',
		CI_CONFIRM_SECRET: 'confirm_secret_test',
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
const sent: { contacts: any[]; emails: any[]; sms: Array<{ body: URLSearchParams; auth: string }>;
	stripe: Array<{ body: string; headers: Record<string, string> }>; meta: { body: any; path: string }[] } = {
	contacts: [],
	sms: [],
	stripe: [],
	emails: [],
	meta: [],
};

const CONTACT_PATH = (email: string) => `/audiences/${AUDIENCE}/contacts/${encodeURIComponent(email)}`;

// The worker looks the contact up first; by default the contact is new (404) and is created.
function interceptContactLookup(email: string, status = 404, body: unknown = { message: 'not found' }, times = 1) {
	fetchMock.get(RESEND_ORIGIN).intercept({ method: 'GET', path: CONTACT_PATH(email) }).reply(status, body as any).times(times);
}

function interceptContacts(status = 201, times = 1) {
	interceptContactLookup('reader@example.com', 404, undefined, times);
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
			return status === 200 ? { id: 'promo_1', code } : { error: { message: 'boom', type: status === 409 ? 'idempotency_error' : 'invalid_request_error' } };
		})
		.times(times);
}

function interceptSms(status = 201, times = 1) {
	fetchMock
		.get(TWILIO_ORIGIN)
		.intercept({ method: 'POST', path: '/2010-04-01/Accounts/ACtest/Messages.json' })
		.reply(status, (opts: any) => {
			sent.sms.push({ body: new URLSearchParams(String(opts.body ?? '')), auth: String((opts.headers as any)?.authorization ?? (opts.headers as any)?.Authorization ?? '') });
			return status < 300 ? { sid: 'SM1' } : { code: 21211, message: 'bad number' };
		})
		.times(times);
}

function interceptPromoStatus(entry: Record<string, unknown>) {
	fetchMock
		.get(STRIPE_ORIGIN)
		.intercept({ method: 'GET', path: /^\/v1\/promotion_codes\?/ })
		.reply(200, { data: [entry] });
}

function subscribeWithPhone(email: string, phone: string) {
	return call('/api/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, consent: true, source: 'miamicontactimprov:start', phone }),
	});
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
	sent.sms.length = 0;
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
		expect(mail.from).toBe('Miami CI <hello@miamicontactimprov.com>');
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
		expect(mail.text).toContain('occasional discount, about once a month, 20% off');
		expect(mail.text).not.toMatch(/two months|—|–/);
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
		interceptContactLookup('first.last+a@gmail.com');
		interceptContactLookup('firstlast@googlemail.com');
		fetchMock.get(RESEND_ORIGIN).intercept({ method: 'POST', path: `/audiences/${AUDIENCE}/contacts` }).reply(201, { id: 'c' }).times(2);
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
		const stateKey = (await env.EMAIL_SUBS.list()).keys.map((k) => k.name).find((k) => k.startsWith('ci10:')) as string;
		const stored = JSON.parse((await env.EMAIL_SUBS.get(stateKey)) ?? '{}');
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

	function subscribeWithName(name: unknown) {
		return call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'reader@example.com', consent: true, source: 'miamicontactimprov:popup:home', name }),
		});
	}

	it('stores a cleaned name, splits it for Resend, and greets by first name', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();

		await subscribeWithName('  Ana \u0007 Maria   Lopez ');

		expect(sent.contacts[0]).toMatchObject({ email: 'reader@example.com', first_name: 'Ana', last_name: 'Maria Lopez' });
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored.name).toBe('Ana Maria Lopez');
		expect(sent.emails[0].text.startsWith('Hi Ana, thanks for signing up.')).toBe(true);
		expect(sent.emails[0].text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(120);
	});

	it('works without a name: no name fields, plain greeting', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();

		await subscribeWithName(undefined);

		expect(sent.contacts[0]).not.toHaveProperty('first_name');
		expect(sent.contacts[0]).not.toHaveProperty('last_name');
		const stored = JSON.parse((await env.EMAIL_SUBS.get('reader@example.com')) ?? '{}');
		expect(stored).not.toHaveProperty('name');
		expect(sent.emails[0].text.startsWith('Thanks for signing up.')).toBe(true);
	});

	it('keeps a single word as first name only and caps the name at 80 characters', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();

		await subscribeWithName('Zed' + 'z'.repeat(200));

		expect(sent.contacts[0].first_name).toHaveLength(80);
		expect(sent.contacts[0]).not.toHaveProperty('last_name');
	});

	it('texts the code to a phone number, in E.164, within 160 characters', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();
		interceptSms();

		await subscribeWithPhone('reader@example.com', '(305) 555-1234');

		expect(sent.sms).toHaveLength(1);
		const code = new URLSearchParams(sent.stripe[0].body).get('code') as string;
		const sms = sent.sms[0].body;
		expect(sms.get('To')).toBe('+13055551234');
		expect(sms.get('From')).toBe('+18335550100');
		expect(sms.get('Body')).toBe(smsBody(code));
		expect(sms.get('Body')).toMatch(/^Miami CI: /);
		expect((sms.get('Body') ?? '').length).toBeLessThanOrEqual(160);
		expect(sent.sms[0].auth).toBe(`Basic ${btoa('ACtest:twilio_token_test')}`);
		expect(sent.emails).toHaveLength(1);
	});

	it('still sends the email when the text fails, and logs neither code nor full phone', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();
		interceptSms(400);
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await subscribeWithPhone('reader@example.com', '3055551234');

		const logged = JSON.stringify(spy.mock.calls);
		spy.mockRestore();
		expect(sent.emails).toHaveLength(1);
		expect(logged).not.toContain('3055551234');
		expect(logged).not.toContain('CI10-');
	});

	it('still sends the text when the email fails', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails(500);
		interceptSms();

		await subscribeWithPhone('reader@example.com', '+13055551234');

		expect(sent.sms).toHaveLength(1);
		const stateKey = (await env.EMAIL_SUBS.list()).keys.map((k) => k.name).find((k) => k.startsWith('ci10:')) as string;
		const state = JSON.parse((await env.EMAIL_SUBS.get(stateKey)) ?? '{}');
		expect(state.welcome_sent_at).toBeUndefined();
		expect(state.sms_sent_at).toBeGreaterThan(0);
	});

	it('skips the text when the number cannot be made E.164', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();

		await subscribeWithPhone('reader@example.com', '12345678');

		expect(sent.sms).toHaveLength(0);
		expect(sent.emails).toHaveLength(1);
	});

	async function seedCode(): Promise<string> {
		interceptContacts(201);
		interceptPromo();
		interceptEmails();
		await subscribe('reader@example.com', 'miamicontactimprov:start');
		return new URLSearchParams(sent.stripe[0].body).get('code') as string;
	}

	function interceptPatch(status = 200) {
		fetchMock.get(RESEND_ORIGIN).intercept({ method: 'PATCH', path: CONTACT_PATH('reader@example.com') })
			.reply(status, (opts: any) => { sent.contacts.push(JSON.parse(String(opts.body ?? '{}'))); return { id: 'c1' }; });
	}

	async function link(email: string, expires: number, secret = 'confirm_secret_test') {
		const sig = await signConfirmation(secret, email, expires);
		return `/api/ci/resubscribe?${new URLSearchParams({ e: email, x: String(expires), s: sig }).toString()}`;
	}

	async function getLink(path: string) {
		const ctx = createExecutionContext();
		const res = await worker.fetch(new Request(`https://newsletter.test${path}`), testEnv(), ctx);
		await waitOnExecutionContext(ctx);
		return res;
	}

	it('never flips an opt-out from the public form: it sends one signed confirmation, once per 24h', async () => {
		await seedCode();
		sent.emails.length = 0;

		interceptContactLookup('reader@example.com', 200, { id: 'c1', unsubscribed: true }, 2);
		interceptEmails();
		await subscribe('reader@example.com', 'miamicontactimprov:start');
		await subscribe('reader@example.com', 'miamicontactimprov:start');

		expect(sent.contacts.filter((c) => 'unsubscribed' in c && c.unsubscribed === false && !c.email)).toHaveLength(0);
		expect(sent.emails).toHaveLength(1);
		expect(sent.emails[0].subject).toBe('Confirm you want emails again');
		expect(sent.emails[0].text).toMatch(/\/api\/ci\/resubscribe\?e=reader%40example\.com&x=\d+&s=[0-9a-f]{64}/);
		expect(sent.emails[0].text).not.toContain('CI10-');
		expect(sent.stripe).toHaveLength(1);
	});

	async function postLink(path: string) {
		const ctx = createExecutionContext();
		const res = await worker.fetch(new Request('https://newsletter.test/api/ci/resubscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URL(`https://x${path}`).searchParams.toString(),
		}), testEnv(), ctx);
		await waitOnExecutionContext(ctx);
		return res;
	}

	it('GET on a valid link only shows a Confirm form and changes nothing', async () => {
		await seedCode();
		const before = sent.emails.length;

		const res = await getLink(await link('reader@example.com', Math.floor(Date.now() / 1000) + 3600));
		const html = await res.text();

		expect(res.status).toBe(200);
		expect(html).toContain('<form method="post" action="/api/ci/resubscribe">');
		expect(html).toContain('name="e" value="reader@example.com"');
		expect(html).toContain('name="s"');
		expect(html).toContain('Confirm');
		expect(sent.emails).toHaveLength(before);
		expect((await env.EMAIL_SUBS.list()).keys.some((k) => k.name.startsWith('ci-resub:'))).toBe(false);
	});

	it('POST resubscribes once and refuses a repeat', async () => {
		await seedCode();
		interceptPatch();
		interceptPromoStatus({ active: true, times_redeemed: 0, max_redemptions: 1, expires_at: Math.floor(Date.now() / 1000) + 86400 });
		interceptEmails();
		const path = await link('reader@example.com', Math.floor(Date.now() / 1000) + 3600);

		const first = await postLink(path);
		expect(first.status).toBe(303);
		const second = await postLink(path);
		expect(second.status).toBe(200);
		expect(await second.text()).toContain('You are already subscribed');
		expect(sent.emails).toHaveLength(2);
		const done = (await env.EMAIL_SUBS.list()).keys.map((k) => k.name).find((k) => k.startsWith('ci-resub:')) as string;
		expect(JSON.parse((await env.EMAIL_SUBS.get(done)) ?? '{}').resubscribed_at).toBeGreaterThan(0);
	});

	it('a valid signed link resubscribes and re-sends the same unused code', async () => {
		const code = await seedCode();
		interceptPatch();
		interceptPromoStatus({ active: true, times_redeemed: 0, max_redemptions: 1, expires_at: Math.floor(Date.now() / 1000) + 86400 });
		interceptEmails();

		const res = await postLink(await link('reader@example.com', Math.floor(Date.now() / 1000) + 3600));

		expect(res.status).toBe(303);
		expect(res.headers.get('Location')).toBe('https://miamicontactimprov.com/?resubscribed=1');
		expect(sent.contacts.at(-1)).toEqual({ unsubscribed: false });
		expect(sent.stripe).toHaveLength(1);
		expect(sent.emails).toHaveLength(2);
		expect(sent.emails[1].text).toContain(code);
	});

	it('a valid link re-sends nothing when the code was already used', async () => {
		await seedCode();
		interceptPatch();
		interceptPromoStatus({ active: false, times_redeemed: 1, max_redemptions: 1, expires_at: null });

		const res = await postLink(await link('reader@example.com', Math.floor(Date.now() / 1000) + 3600));

		expect(res.status).toBe(303);
		expect(sent.stripe).toHaveLength(1);
		expect(sent.emails).toHaveLength(1);
	});

	it('rejects an expired, tampered or wrongly keyed link without touching Resend', async () => {
		const future = Math.floor(Date.now() / 1000) + 3600;
		expect((await getLink(await link('reader@example.com', Math.floor(Date.now() / 1000) - 5))).status).toBe(410);
		const good = await link('reader@example.com', future);
		expect((await getLink(good.replace('reader%40example.com', 'other%40example.com'))).status).toBe(400);
		expect((await getLink(good.replace(/x=\d+/, `x=${future + 99999}`))).status).toBe(400);
		expect((await getLink(good.slice(0, -2) + '00')).status).toBe(400);
		expect((await getLink(await link('reader@example.com', future, 'wrong_secret'))).status).toBe(400);
		expect((await getLink('/api/ci/resubscribe')).status).toBe(400);
		expect((await postLink(good.replace('reader%40example.com', 'other%40example.com'))).status).toBe(400);
		expect((await postLink(await link('reader@example.com', Math.floor(Date.now() / 1000) - 5))).status).toBe(410);
	});

	it('texts a given number once ever, even for a different email', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();
		interceptSms();
		await subscribeWithPhone('reader@example.com', '3055551234');

		interceptContactLookup('second@example.com');
		fetchMock.get(RESEND_ORIGIN).intercept({ method: 'POST', path: `/audiences/${AUDIENCE}/contacts` }).reply(201, { id: 'c' });
		interceptPromo();
		interceptEmails();
		await subscribeWithPhone('second@example.com', '(305) 555-1234');

		expect(sent.sms).toHaveLength(1);
		expect(sent.emails).toHaveLength(2);
		await env.EMAIL_SUBS.delete('second@example.com');
	});

	it('sends no text to a non US or Canada number but still emails', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();

		await subscribeWithPhone('reader@example.com', '+44 20 7946 0958');

		expect(sent.sms).toHaveLength(0);
		expect(sent.emails).toHaveLength(1);
	});

	it('uses MessagingServiceSid when TWILIO_FROM is an MG sid', async () => {
		interceptContacts();
		interceptPromo();
		interceptEmails();
		interceptSms();

		await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'reader@example.com', consent: true, source: 'miamicontactimprov:start', phone: '3055551234' }),
		}, testEnv({ TWILIO_FROM: 'MGabc123' }));

		expect(sent.sms[0].body.get('MessagingServiceSid')).toBe('MGabc123');
		expect(sent.sms[0].body.has('From')).toBe(false);
	});

	it('treats a Stripe 409 as not definite: the next signup reuses the same attempt and code', async () => {
		interceptContacts(201, 2);
		interceptPromo(409);
		interceptPromo();
		interceptEmails();

		await subscribe('reader@example.com', 'miamicontactimprov:start');
		await subscribe('reader@example.com', 'miamicontactimprov:start');

		const keys = sent.stripe.map((r) => Object.entries(r.headers).find(([k]) => k.toLowerCase() === 'idempotency-key')?.[1]);
		expect(keys[0]).toBe(keys[1]);
		expect(new URLSearchParams(sent.stripe[0].body).get('code')).toBe(new URLSearchParams(sent.stripe[1].body).get('code'));
		expect(sent.emails).toHaveLength(1);
	});

	it('answers 429 when the rate limiter says no, and keeps working when it says yes', async () => {
		const deny = testEnv({ SUBSCRIBE_LIMITER: { limit: async () => ({ success: false }) } });
		const res = await call('/api/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
			body: JSON.stringify({ email: 'reader@example.com', consent: true, source: 'other' }),
		}, deny);
		expect(res.status).toBe(429);
		expect(res.body.ok).toBe(false);
		expect(await env.EMAIL_SUBS.get('reader@example.com')).toBeNull();
	});

	it('normalizes emails and phones', () => {
		expect(normalizeEmail('First.Last+x@Gmail.com')).toBe('firstlast@gmail.com');
		expect(normalizeEmail('a.b+c@example.com')).toBe('a.b@example.com');
		expect(toE164('305-555-1234')).toBe('+13055551234');
		expect(toE164('1 305 555 1234')).toBe('+13055551234');
		expect(toE164('+44 20 7946 0958')).toBeNull();
		expect(toE164('+52 55 1234 5678')).toBeNull();
		expect(toE164('(055) 555-1234')).toBeNull();
		expect(toE164('12345')).toBeNull();
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
		expect(Object.keys(stored).sort()).toEqual(['consent', 'email', 'source', 'ts']);
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
