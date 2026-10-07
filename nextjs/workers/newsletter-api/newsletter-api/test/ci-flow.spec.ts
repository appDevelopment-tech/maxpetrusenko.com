import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';
import { generateCode, hashOtp, spendSend, spendPhoneSend, keyFor, MAX_SENDS_PER_HOUR } from '../src/otp';
import { startVerification } from '../src/sms';

const RESEND = 'https://api.resend.com';
const STRIPE = 'https://api.stripe.com';
const VERIFY = 'https://verify.twilio.com';
const AUD = 'aud_test';
const SID = 'VAtest';
const EMAIL = 'reader@example.com';

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, {
		ADMIN_TOKEN: 'admin_test',
		RESEND_API_KEY: 're_test',
		RESEND_AUDIENCE_ID: AUD,
		CI_ONE_EVENT_COUPON_ID: 'coupon_test10',
		STRIPE_SECRET_KEY: 'sk_test_placeholder',
		TWILIO_ACCOUNT_SID: 'ACtest',
		TWILIO_AUTH_TOKEN: 'twilio_token_test',
		TWILIO_VERIFY_SID: SID,
		CI_CONFIRM_SECRET: 'confirm_secret_test',
	}, overrides) as unknown as Env;
}

async function post(path: string, body: unknown, e: Env = testEnv()): Promise<{ status: number; body: any }> {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request(`https://newsletter.test${path}`, {
		method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
	}), e, ctx);
	await waitOnExecutionContext(ctx);
	const t = await res.text();
	return { status: res.status, body: t ? JSON.parse(t) : null };
}

const signup = (extra: Record<string, unknown> = {}, e?: Env, email = EMAIL) =>
	post('/api/subscribe', { email, consent: true, source: 'miamicontactimprov:popup:home', name: 'Ana Lopez', ...extra }, e);
const verify = (code: string, email = EMAIL, e?: Env) => post('/api/verify', { email, code }, e);

const log: { emails: any[]; contacts: any[]; stripe: string[]; verifyCalls: Array<{ path: string; body: URLSearchParams }> } = {
	emails: [], contacts: [], stripe: [], verifyCalls: [],
};

const contactPath = (email: string) => `/audiences/${AUD}/contacts/${encodeURIComponent(email)}`;

function lookup(state: 'missing' | 'subscribed' | 'unsubscribed', email = EMAIL, times = 1) {
	const p = fetchMock.get(RESEND).intercept({ method: 'GET', path: contactPath(email) });
	(state === 'missing' ? p.reply(404, { message: 'not found' }) : p.reply(200, { id: 'c1', unsubscribed: state === 'unsubscribed' })).times(times);
}
function createContact(times = 1) {
	fetchMock.get(RESEND).intercept({ method: 'POST', path: `/audiences/${AUD}/contacts` })
		.reply(201, (o: any) => { log.contacts.push(JSON.parse(String(o.body))); return { id: 'c1' }; }).times(times);
}
function patchContact(email = EMAIL) {
	fetchMock.get(RESEND).intercept({ method: 'PATCH', path: contactPath(email) })
		.reply(200, (o: any) => { log.contacts.push({ patch: JSON.parse(String(o.body)) }); return { id: 'c1' }; });
}
function emails(times = 1, status = 200) {
	fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails' })
		.reply(status, (o: any) => { log.emails.push(JSON.parse(String(o.body))); return { id: `e${log.emails.length}` }; }).times(times);
}
function mint(status = 200) {
	fetchMock.get(STRIPE).intercept({ method: 'POST', path: '/v1/promotion_codes' })
		.reply(status, (o: any) => { log.stripe.push(String(o.body)); return { id: 'p1', code: new URLSearchParams(String(o.body)).get('code') }; });
}
function promoStatus(entry: Record<string, unknown>) {
	fetchMock.get(STRIPE).intercept({ method: 'GET', path: /^\/v1\/promotion_codes\?/ }).reply(200, { data: [entry] });
}
const usable = () => promoStatus({ active: true, times_redeemed: 0, max_redemptions: 1, expires_at: Math.floor(Date.now() / 1000) + 86400 });
function twilio(startStatus = 201, check: 'approved' | 'pending' = 'approved', checks = 1) {
	fetchMock.get(VERIFY).intercept({ method: 'POST', path: `/v2/Services/${SID}/Verifications` })
		.reply(startStatus, (o: any) => { log.verifyCalls.push({ path: 'Verifications', body: new URLSearchParams(String(o.body)) }); return { status: 'pending' }; });
	if (startStatus < 300 && checks > 0) {
		fetchMock.get(VERIFY).intercept({ method: 'POST', path: `/v2/Services/${SID}/VerificationCheck` })
			.reply(200, (o: any) => { log.verifyCalls.push({ path: 'VerificationCheck', body: new URLSearchParams(String(o.body)) }); return { status: check }; }).times(checks);
	}
}

const emailedCode = (i = 0): string => (log.emails[i].text.match(/\b(\d{6})\b/) as RegExpMatchArray)[1];
const otpKey = async (email = EMAIL) => keyFor('otp', email);

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(async () => {
	for (const k of (await env.EMAIL_SUBS.list()).keys) await env.EMAIL_SUBS.delete(k.name);
	log.emails.length = 0; log.contacts.length = 0; log.stripe.length = 0; log.verifyCalls.length = 0;
	fetchMock.assertNoPendingInterceptors();
});

describe('step 1: subscribe sends a code and nothing else', () => {
	it('emails a 6 digit code, stores only its hash, and creates no contact, record or promo code', async () => {
		emails();
		const { status, body } = await signup();
		expect(status).toBe(200);
		expect(body).toEqual({ ok: true, step: 'verify', channel: 'email' });
		expect(log.emails[0].from).toBe('Miami CI <hello@miamicontactimprov.com>');
		const code = emailedCode();
		expect(code).toMatch(/^\d{6}$/);
		expect(log.emails[0].text).not.toMatch(/CI10-|—|–/);
		const raw = (await env.EMAIL_SUBS.get(await otpKey())) as string;
		expect(raw).not.toContain(code);
		expect(JSON.parse(raw).codeHash).toMatch(/^[0-9a-f]{64}$/);
		expect(await env.EMAIL_SUBS.get(EMAIL)).toBeNull();
		expect(log.contacts).toHaveLength(0);
		expect(log.stripe).toHaveLength(0);
	});

	it('rejects a bad email or missing consent before sending anything', async () => {
		expect((await signup({ email: 'nope' }, undefined, 'nope')).status).toBe(400);
		expect((await signup({ consent: false })).status).toBe(400);
		expect(log.emails).toHaveLength(0);
	});
});

describe('step 2: verify', () => {
	async function start() {
		emails();
		await signup();
		return emailedCode();
	}

	it('mints the code only after a correct code, then subscribes and emails it', async () => {
		const code = await start();
		lookup('missing'); createContact(); mint(); emails();

		const { status, body } = await verify(code);

		expect(status).toBe(200);
		expect(body.ok).toBe(true);
		expect(body.code).toMatch(/^CI10-[A-Z0-9]{6}$/);
		expect(log.stripe).toHaveLength(1);
		expect(log.contacts[0]).toMatchObject({ email: EMAIL, first_name: 'Ana', last_name: 'Lopez', unsubscribed: false });
		expect(log.emails[1].text).toContain(body.code);
		expect(log.emails[1].text.split('\n')).toContain(body.code);
		expect(log.emails[1].html).toContain(body.code);
		expect(log.emails[1].html).toContain(`https://miamicontactimprov.com/t/${body.code.replace('-', '')}`);
		expect(log.emails[1].html).toContain('Buy your ticket, 10% off applied');
		const record = JSON.parse((await env.EMAIL_SUBS.get(EMAIL)) as string);
		expect(record).toMatchObject({ email: EMAIL, name: 'Ana Lopez', verified: 'email' });
		expect(await env.EMAIL_SUBS.get(await otpKey())).toBeNull();
	});

	it('never returns a code for a wrong one, counts attempts, and locks after 5', async () => {
		const code = await start();
		const wrong = code === '000000' ? '111111' : '000000';
		for (let i = 1; i <= 4; i++) {
			const r = await verify(wrong);
			expect(r.status).toBe(400);
			expect(r.body.code).toBeUndefined();
			expect(r.body.attempts_left).toBe(5 - i);
		}
		const locked = await verify(wrong);
		expect(locked.status).toBe(429);
		expect(locked.body.code).toBeUndefined();
		// even the right code is refused during the lock, and a new signup cannot start
		expect((await verify(code)).status).toBe(429);
		expect((await signup()).status).toBe(429);
		expect(log.stripe).toHaveLength(0);
		expect(log.contacts).toHaveLength(0);
	});

	it('refuses an expired code', async () => {
		await start();
		const key = await otpKey();
		const rec = JSON.parse((await env.EMAIL_SUBS.get(key)) as string);
		rec.expiresAt = Date.now() - 1000;
		await env.EMAIL_SUBS.put(key, JSON.stringify(rec));
		const r = await verify('123456');
		expect(r.status).toBe(400);
		expect(r.body.expired).toBe(true);
	});

	it('rejects input that is not 6 digits', async () => {
		expect((await verify('12345')).status).toBe(400);
		expect((await verify('abcdef')).status).toBe(400);
	});

	it('a resent code replaces the old one', async () => {
		const first = await start();
		// move the throttle record back so the resend is allowed now
		await env.EMAIL_SUBS.put(await keyFor('rs', EMAIL), JSON.stringify([Date.now() - 60_000]));
		emails();
		const r = await post('/api/resend-code', { email: EMAIL });
		expect(r.body).toMatchObject({ ok: true, step: 'verify', channel: 'email' });
		const second = emailedCode(1);
		if (first !== second) expect((await verify(first)).status).toBe(400);
		lookup('missing'); createContact(); mint(); emails();
		expect((await verify(second)).body.code).toMatch(/^CI10-/);
	});

	it('refuses to resend inside 30 seconds, and without a pending signup', async () => {
		await start();
		const r = await post('/api/resend-code', { email: EMAIL });
		expect(r.status).toBe(429);
		expect(r.body.retry_after).toBeGreaterThan(0);
		expect((await post('/api/resend-code', { email: 'nobody@example.com' })).status).toBe(400);
	});

	it('reverses an opt-out only after an emailed code, and shows an existing unused code on repeat', async () => {
		const code = await start();
		lookup('unsubscribed'); patchContact(); mint(); emails();
		const first = await verify(code);
		expect(log.contacts.find((c) => c.patch)).toEqual({ patch: { unsubscribed: false } });

		// second signup: fresh OTP, then the same code comes back without a new mint
		await env.EMAIL_SUBS.put(await keyFor('rs', EMAIL), JSON.stringify([Date.now() - 60_000]));
		emails();
		await signup();
		lookup('subscribed'); usable(); // no email: the welcome was already sent
		const again = await verify(emailedCode(log.emails.length - 1));
		expect(again.body.code).toBe(first.body.code);
		expect(log.stripe).toHaveLength(1);
	});

	it('says "used" instead of a code when the person already spent theirs', async () => {
		const code = await start();
		lookup('missing'); createContact(); mint(); emails();
		await verify(code);
		await env.EMAIL_SUBS.put(await keyFor('rs', EMAIL), JSON.stringify([Date.now() - 60_000]));
		emails();
		await signup();
		lookup('subscribed'); promoStatus({ active: false, times_redeemed: 1, max_redemptions: 1, expires_at: null });
		const r = await verify(emailedCode(log.emails.length - 1));
		expect(r.body).toEqual({ ok: true, code: null, used: true, emailed: false });
	});

	it('answers 502 and gives no code when Stripe cannot mint', async () => {
		const code = await start();
		lookup('missing'); createContact(); mint(400);
		const r = await verify(code);
		expect(r.status).toBe(502);
		expect(r.body.code).toBeUndefined();
	});
});

describe('text codes through Twilio Verify', () => {
	it('sends the code by Verify (US/CA phone), sends no email code, and checks it with Verify', async () => {
		lookup('missing'); twilio();
		const { body } = await signup({ phone: '(305) 555-1234' });
		expect(body).toEqual({ ok: true, step: 'verify', channel: 'sms' });
		expect(log.verifyCalls[0].body.get('To')).toBe('+13055551234');
		expect(log.verifyCalls[0].body.get('Channel')).toBe('sms');
		expect(log.emails).toHaveLength(0);
		const pending = JSON.parse((await env.EMAIL_SUBS.get(await otpKey())) as string);
		expect(pending.codeHash).toBeUndefined();

		lookup('missing'); createContact(); mint(); emails();
		const r = await verify('424242');
		expect(log.verifyCalls[1]).toMatchObject({ path: 'VerificationCheck' });
		expect(log.verifyCalls[1].body.get('Code')).toBe('424242');
		expect(r.body.code).toMatch(/^CI10-/);
		expect(log.emails).toHaveLength(1);
		expect(log.emails[0].text).toContain(r.body.code);
	});

	it('counts a rejected Verify check as an attempt and gives no code', async () => {
		lookup('missing'); twilio(201, 'pending');
		await signup({ phone: '3055551234' });
		const r = await verify('000000');
		expect(r.status).toBe(400);
		expect(r.body.attempts_left).toBe(4);
		expect(r.body.code).toBeUndefined();
	});

	it('falls back to an emailed code for a non US/CA number, an unset Verify service, or a Twilio failure', async () => {
		emails();
		expect((await signup({ phone: '+44 20 7946 0958' })).body.channel).toBe('email');
		await env.EMAIL_SUBS.delete(await keyFor('rs', EMAIL)); await env.EMAIL_SUBS.delete(await otpKey());
		emails();
		expect((await signup({ phone: '3055551234' }, testEnv({ TWILIO_VERIFY_SID: undefined }))).body.channel).toBe('email');
		await env.EMAIL_SUBS.delete(await keyFor('rs', EMAIL)); await env.EMAIL_SUBS.delete(await otpKey());
		lookup('missing'); twilio(400); emails();
		expect((await signup({ phone: '3055551234' })).body.channel).toBe('email');
		expect(log.emails).toHaveLength(3);
	});

	it('sends an opted-out address its code by email even when a phone is given, so a phone cannot reverse the opt-out', async () => {
		lookup('unsubscribed'); emails();
		const { body } = await signup({ phone: '3055551234' });
		expect(body.channel).toBe('email');
		expect(log.verifyCalls).toHaveLength(0);
	});

	it('gives one code per phone number, whatever the email', async () => {
		lookup('missing'); twilio();
		await signup({ phone: '3055551234' });
		lookup('missing'); createContact(); mint(); emails();
		expect((await verify('111111')).body.code).toMatch(/^CI10-/);

		lookup('missing', 'second@example.com'); twilio();
		await signup({ phone: '(305) 555-1234' }, undefined, 'second@example.com');
		// no contact lookup, create or promo call: the owner check runs before any of that
		const r = await verify('222222', 'second@example.com');
		expect(JSON.parse((await env.EMAIL_SUBS.get('second@example.com')) as string).email_verified).toBe(false);
		expect(r.body).toEqual({ ok: true, code: null, used: true, emailed: false });
		expect(log.stripe).toHaveLength(1);
	});

	it('never logs a full phone number when Verify fails', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		twilio(400);
		await startVerification({ TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 't', TWILIO_VERIFY_SID: SID }, '+13055551234');
		const logged = JSON.stringify(spy.mock.calls);
		spy.mockRestore();
		expect(logged).not.toContain('3055551234');
	});
});

describe('phone verification does not prove an email', () => {
	it('shows a minted code to a phone verify only for the phone it was minted for', async () => {
		lookup('missing'); twilio();
		await signup({ phone: '3055551234' });
		lookup('missing'); createContact(); mint(); emails();
		const first = await verify('111111');
		expect(first.body.code).toMatch(/^CI10-/);

		await env.EMAIL_SUBS.put(await keyFor('rs', EMAIL), JSON.stringify([Date.now() - 60_000]));
		lookup('subscribed'); twilio();
		await signup({ phone: '(305) 555-1234' });
		lookup('subscribed'); usable();
		const again = await verify('222222');
		expect(again.body.code).toBe(first.body.code);
	});

	it('never shows an existing code to a phone verify from a different phone, or one minted by email', async () => {
		emails();
		await signup();
		lookup('missing'); createContact(); mint(); emails();
		const minted = await verify(emailedCode());
		expect(minted.body.code).toMatch(/^CI10-/);

		await env.EMAIL_SUBS.put(await keyFor('rs', EMAIL), JSON.stringify([Date.now() - 60_000]));
		lookup('subscribed'); twilio();
		await signup({ phone: '3055559876' });
		lookup('subscribed'); usable();
		const r = await verify('333333');
		expect(r.body).toEqual({ ok: true, code: null, used: true, emailed: false });
		expect(JSON.stringify(r.body)).not.toContain(minted.body.code);
		expect(log.stripe).toHaveLength(1);
	});

	it('keeps an earlier email proof on the record across a later phone verify', async () => {
		emails();
		await signup();
		lookup('missing'); createContact(); mint(); emails();
		await verify(emailedCode());
		await env.EMAIL_SUBS.put(await keyFor('rs', EMAIL), JSON.stringify([Date.now() - 60_000]));
		lookup('subscribed'); twilio();
		await signup({ phone: '3055559876' });
		lookup('subscribed'); usable();
		await verify('444444');
		expect(JSON.parse((await env.EMAIL_SUBS.get(EMAIL)) as string).email_verified).toBe(true);
	});

	it('answers step 1 with the same shape for a normal and an opted-out address', async () => {
		lookup('missing'); twilio(201, 'approved', 0);
		const normal = await signup({ phone: '3055551234' });
		lookup('unsubscribed', 'out@example.com'); emails();
		const out = await signup({ phone: '3055550000' }, undefined, 'out@example.com');
		expect(Object.keys(normal.body).sort()).toEqual(Object.keys(out.body).sort());
		expect(normal.body.channel).toBe('sms');
		expect(out.body.channel).toBe('email'); // the channel that actually sent
	});
});

describe('send budgets and the verify limiter', () => {
	it('allows a phone 3 Verify sends an hour and 6 a day', async () => {
		const kv = env.EMAIL_SUBS;
		const t0 = 2_000_000_000_000;
		for (let i = 0; i < 3; i++) expect((await spendPhoneSend(kv, '+13055550001', t0 + i * 1000)).ok).toBe(true);
		expect((await spendPhoneSend(kv, '+13055550001', t0 + 5000)).ok).toBe(false);
		for (let i = 0; i < 3; i++) expect((await spendPhoneSend(kv, '+13055550001', t0 + 3_700_000 + i * 1000)).ok).toBe(true);
		const daily = await spendPhoneSend(kv, '+13055550001', t0 + 7_500_000);
		expect(daily.ok).toBe(false);
		expect((await spendPhoneSend(kv, '+13055550001', t0 + 90_000_000)).ok).toBe(true);
		expect(await kv.get(`rs:${await (await import('../src/common')).sha256Hex('+13055550001')}`)).not.toBeNull();
	});

	it('falls back to email when the phone is over its send budget, and 429s a text resend', async () => {
		const hash = await (await import('../src/common')).sha256Hex('+13055551234');
		const now = Date.now();
		await env.EMAIL_SUBS.put(`rs:${hash}`, JSON.stringify([now - 5000, now - 4000, now - 3000]), { expirationTtl: 3600 });
		lookup('missing'); emails();
		expect((await signup({ phone: '3055551234' })).body.channel).toBe('email');
		expect(log.verifyCalls).toHaveLength(0);
	});

	it('limits /api/verify per email address on a second binding, keyed by hash', async () => {
		const seen: string[] = [];
		const e = testEnv({ VERIFY_LIMITER: { limit: async ({ key }: { key: string }) => { seen.push(key); return { success: false }; } } });
		const r = await post('/api/verify', { email: 'Reader@Example.com', code: '123456' }, e);
		expect(r.status).toBe(429);
		expect(seen).toEqual([await (await import('../src/common')).sha256Hex('reader@example.com')]);
		// not applied to the other endpoints
		const ok = testEnv({ VERIFY_LIMITER: { limit: async () => { throw new Error('should not be called'); } } });
		expect((await post('/api/resend-code', { email: 'nobody@example.com' }, ok)).status).toBe(400);
	});
});

describe('limits and primitives', () => {
	it('hashes an email code with a key, per email and per code', async () => {
		const a = await hashOtp('k', 'a@x.com', '123456');
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(await hashOtp('k', 'A@x.com', '123456')).toBe(a);
		expect(await hashOtp('k', 'b@x.com', '123456')).not.toBe(a);
		expect(await hashOtp('k', 'a@x.com', '123457')).not.toBe(a);
		expect(await hashOtp('other', 'a@x.com', '123456')).not.toBe(a);
	});

	it('generates six digit codes', () => {
		for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^\d{6}$/);
		expect(new Set(Array.from({ length: 50 }, generateCode)).size).toBeGreaterThan(40);
	});

	it('spaces sends 30 seconds apart and allows 4 an hour (first send plus 3 resends)', async () => {
		const kv = env.EMAIL_SUBS;
		const t0 = 1_000_000_000_000;
		expect((await spendSend(kv, 'budget@example.com', t0)).ok).toBe(true);
		const tooSoon = await spendSend(kv, 'budget@example.com', t0 + 10_000);
		expect(tooSoon).toEqual({ ok: false, retryAfter: 20 });
		for (let i = 1; i < MAX_SENDS_PER_HOUR; i++) expect((await spendSend(kv, 'budget@example.com', t0 + i * 31_000)).ok).toBe(true);
		const capped = await spendSend(kv, 'budget@example.com', t0 + 5 * 31_000);
		expect(capped.ok).toBe(false);
		expect((await spendSend(kv, 'budget@example.com', t0 + 3_700_000)).ok).toBe(true);
	});

	it('rate limits verify and resend-code with the shared binding', async () => {
		const deny = testEnv({ SUBSCRIBE_LIMITER: { limit: async () => ({ success: false }) } });
		expect((await post('/api/verify', { email: EMAIL, code: '123456' }, deny)).status).toBe(429);
		expect((await post('/api/resend-code', { email: EMAIL }, deny)).status).toBe(429);
		expect((await post('/api/subscribe', { email: EMAIL, consent: true, source: 'miamicontactimprov:x' }, deny)).status).toBe(429);
	});

	it('keeps flow state out of /api/list', async () => {
		emails();
		await signup();
		const ctx = createExecutionContext();
		const res = await worker.fetch(new Request('https://newsletter.test/api/list', { headers: { Authorization: 'Bearer admin_test' } }), testEnv(), ctx);
		await waitOnExecutionContext(ctx);
		const body = (await res.json()) as { keys: string[] };
		expect(body.keys.filter((k) => /^(otp|lock|rs|ph|ci10):/.test(k))).toEqual([]);
	});
});
