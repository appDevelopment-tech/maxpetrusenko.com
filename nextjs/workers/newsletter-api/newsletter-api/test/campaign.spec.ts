import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from '../src';
import { normalizeTicketCode, shortTicketLink } from '../src/links';
import { codeEmailHtml, codeEmailText } from '../src/email';
import { signUnsubscribe } from '../src/unsub';
import { currentMonth, monthName } from '../src/monthly';
import { sha256Hex, normalizeEmail } from '../src/common';

const RESEND = 'https://api.resend.com';
const STRIPE = 'https://api.stripe.com';
const AUD = 'aud_test';

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, {
		ADMIN_TOKEN: 'admin_test',
		RESEND_API_KEY: 're_test',
		RESEND_AUDIENCE_ID: AUD,
		STRIPE_SECRET_KEY: 'sk_test_placeholder',
		CI_MONTHLY_COUPON_ID: 'coupon_m20',
		CI_CONFIRM_SECRET: 'confirm_secret_test',
	}, overrides) as unknown as Env;
}

async function send(path: string, init: RequestInit, e: Env = testEnv()) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request(`https://newsletter.test${path}`, init), e, ctx);
	await waitOnExecutionContext(ctx);
	return res;
}
const run = async (body: unknown, e?: Env, auth = true) => {
	const res = await send('/api/ci/monthly-run', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer admin_test' } : {}) },
		body: JSON.stringify(body),
	}, e);
	return { status: res.status, body: (await res.json()) as any };
};

const real = (b: Record<string, unknown> = {}, e?: Env) => run({ confirm: 'send', dry_run: false, ...b }, e);

const log: { stripe: Array<{ body: URLSearchParams; headers: Record<string, string> }>; batches: any[][]; batchHeaders: Array<Record<string, string>>; patches: any[] } = { stripe: [], batches: [], batchHeaders: [], patches: [] };

function contacts(rows: Array<Record<string, unknown>>, hasMore = false) {
	fetchMock.get(RESEND).intercept({ method: 'GET', path: /^\/audiences\/aud_test\/contacts\?/ }).reply(200, { object: 'list', has_more: hasMore, data: rows });
}
function mint(times: number, status = 200) {
	fetchMock.get(STRIPE).intercept({ method: 'POST', path: '/v1/promotion_codes' })
		.reply(status, (o: any) => {
			const body = new URLSearchParams(String(o.body));
			log.stripe.push({ body, headers: o.headers ?? {} });
			return status === 200 ? { id: 'p', code: body.get('code') } : { error: { message: 'x', type: 'invalid_request_error' } };
		}).times(times);
}
function batch(status = 200, times = 1) {
	fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails/batch' })
		.reply(status, (o: any) => { log.batches.push(JSON.parse(String(o.body))); log.batchHeaders.push(o.headers ?? {}); return { data: [] }; }).times(times);
}
const header = (h: Record<string, string>, name: string) => Object.entries(h).find(([k]) => k.toLowerCase() === name)?.[1];

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
afterEach(async () => {
	for (const k of (await env.EMAIL_SUBS.list()).keys) await env.EMAIL_SUBS.delete(k.name);
	log.stripe.length = 0; log.batches.length = 0; log.batchHeaders.length = 0; log.patches.length = 0;
	fetchMock.assertNoPendingInterceptors();
});

describe('ticket links and the code email', () => {
	it('shortens the link without the dash and accepts both forms of a code', () => {
		expect(shortTicketLink('CI10-K7P2QX')).toBe('https://miamicontactimprov.com/t/CI10K7P2QX');
		expect(normalizeTicketCode('ci10k7p2qx')).toBe('CI10-K7P2QX');
		expect(normalizeTicketCode('CI20-ABC123')).toBe('CI20-ABC123');
		for (const bad of ['', 'CI1-ABC123', 'CI10-ABC12', 'XX10-ABC123', 'CI10-ABC123!', 12, null]) expect(normalizeTicketCode(bad)).toBeNull();
	});

	const mail = { greeting: 'Hi Ana,', intro: 'Your code:', code: 'CI10-K7P2QX', buttonLabel: 'Buy your ticket, 10% off applied', terms: 't', details: 'd', footer: 'f' };

	it('puts the code alone on its own line in the text part, with the short link under it', () => {
		const lines = codeEmailText(mail).split('\n');
		expect(lines).toContain('CI10-K7P2QX');
		expect(lines[lines.indexOf('CI10-K7P2QX') - 1]).toBe('');
		expect(lines[lines.indexOf('CI10-K7P2QX') + 1]).toBe('');
		expect(codeEmailText(mail)).toContain('https://miamicontactimprov.com/t/CI10K7P2QX');
	});

	it('renders the code big and alone in the HTML, and a button to the short link', () => {
		const html = codeEmailHtml(mail);
		expect(html).toMatch(/font-size:44px[^>]*>CI10-K7P2QX<\/div>/);
		expect(html).toContain('href="https://miamicontactimprov.com/t/CI10K7P2QX"');
		expect(html).toContain('>Buy your ticket, 10% off applied</a>');
		expect(html).not.toMatch(/<img/);
		expect(codeEmailHtml({ ...mail, intro: '<b>x</b>' })).not.toContain('<b>x</b>');
	});
});

describe('monthly run', () => {
	const rows = [
		{ id: 'c1', email: 'ana@example.com', unsubscribed: false, first_name: 'Ana' },
		{ id: 'c2', email: 'out@example.com', unsubscribed: true },
		{ id: 'c3', email: 'b.o.b@gmail.com', unsubscribed: false },
		{ id: 'c4', email: 'bob@gmail.com', unsubscribed: false }, // same mailbox as c3
		{ id: 'c5', email: 'not-an-email', unsubscribed: false },
	];

	it('needs the admin token', async () => {
		expect((await run({}, undefined, false)).status).toBe(401);
	});

	it('reports a missing coupon id instead of running', async () => {
		const r = await real({ month: '2026-10' }, testEnv({ CI_MONTHLY_COUPON_ID: undefined }));
		expect(r.status).toBe(500);
		expect(r.body.ok).toBe(false);
	});

	it('dry run counts who would get a code and touches nothing', async () => {
		contacts(rows);
		const r = await run({ dry_run: true, month: '2026-10' });
		expect(r.body).toMatchObject({ ok: true, dry_run: true, eligible: 2, would_mint: 2, would_send: 2, minted: 0, sent: 0, skipped: 0, errors: 0 });
		expect((await env.EMAIL_SUBS.list()).keys).toHaveLength(0);
	});

	it('mints one personal 7 day code per eligible address and sends them in a batch, once', async () => {
		contacts(rows); mint(2); batch();
		const first = await real({ month: '2026-10' });
		expect(first.body).toMatchObject({ eligible: 2, minted: 2, sent: 2, skipped: 0, errors: 0, remaining: 0 });

		const hash = await sha256Hex(normalizeEmail('ana@example.com'));
		const ana = log.stripe.find((s) => s.headers && header(s.headers, 'idempotency-key') === `ci20-2026-10-${hash}-1`) as typeof log.stripe[number];
		expect(ana.body.get('promotion[coupon]')).toBe('coupon_m20');
		expect(ana.body.get('max_redemptions')).toBe('1');
		expect(ana.body.get('code')).toMatch(/^CI20-[A-Z0-9]{6}$/);
		const ttl = Number(ana.body.get('expires_at')) - Math.floor(Date.now() / 1000);
		expect(ttl).toBeGreaterThan(7 * 86400 - 60);
		expect(ttl).toBeLessThanOrEqual(7 * 86400);
		expect(header(ana.headers, 'stripe-version')).toBe('2025-09-30.clover');

		expect(log.batches).toHaveLength(1);
		expect(header(log.batchHeaders[0], 'idempotency-key')).toMatch(/^m20-2026-10-[0-9a-f]{32}$/);
		const mails = log.batches[0];
		expect(mails).toHaveLength(2);
		const anaMail = mails.find((m) => m.to[0] === 'ana@example.com');
		expect(anaMail.subject).toBe('Your 20% code for October');
		expect(anaMail.from).toBe('Miami CI <hello@miamicontactimprov.com>');
		const code = ana.body.get('code') as string;
		expect(anaMail.text.split('\n')).toContain(code);
		expect(anaMail.text).toContain(`https://miamicontactimprov.com/t/${code.replace('-', '')}`);
		expect(anaMail.html).toContain('Buy your ticket, 20% off applied');
		expect(anaMail.text).toContain('Hi Ana,');
		expect(header(anaMail.headers, 'list-unsubscribe')).toMatch(/^<https:\/\/newsletter\.test\/api\/ci\/unsubscribe\?e=ana%40example\.com&s=[0-9a-f]{64}>$/);
		expect(header(anaMail.headers, 'list-unsubscribe-post')).toBe('List-Unsubscribe=One-Click');
		expect(anaMail.text).toContain('Unsubscribe: https://newsletter.test/api/ci/unsubscribe?e=ana%40example.com');

		// a rerun in the same month neither mints nor sends again
		contacts(rows);
		const again = await real({ month: '2026-10' });
		expect(again.body).toMatchObject({ eligible: 2, minted: 0, sent: 0, skipped: 2, errors: 0 });
		expect(log.stripe).toHaveLength(2);
		expect(log.batches).toHaveLength(1);
	});

	it('a new month gets new codes', async () => {
		contacts(rows); mint(2); batch();
		await real({ month: '2026-10' });
		contacts(rows); mint(2); batch();
		const next = await real({ month: '2026-11' });
		expect(next.body).toMatchObject({ minted: 2, sent: 2, skipped: 0 });
		expect(log.batches[1][0].subject).toBe('Your 20% code for November');
	});

	it('keeps a minted code when the batch fails and re-sends that same code on the rerun', async () => {
		contacts([rows[0]]); mint(1); batch(500);
		const failed = await real({ month: '2026-10' });
		expect(failed.body).toMatchObject({ minted: 1, sent: 0, errors: 1 });
		const code = log.batches[0][0].text.match(/CI20-[A-Z0-9]{6}/)[0];

		contacts([rows[0]]); batch();
		const retry = await real({ month: '2026-10' });
		expect(retry.body).toMatchObject({ minted: 0, sent: 1, errors: 0 });
		expect(log.stripe).toHaveLength(1);
		expect(log.batches[1][0].text).toContain(code);
	});

	it('counts a Stripe refusal as an error and sends nothing for that address', async () => {
		contacts([rows[0]]); mint(1, 400);
		const r = await real({ month: '2026-10' });
		expect(r.body).toMatchObject({ eligible: 1, minted: 0, sent: 0, errors: 1 });
		expect(log.batches).toHaveLength(0);
	});

	it('stops at the limit and says how many remain', async () => {
		contacts([rows[0], { id: 'x', email: 'cara@example.com', unsubscribed: false }, { id: 'y', email: 'dan@example.com', unsubscribed: false }]);
		mint(2); batch();
		const r = await real({ month: '2026-10', limit: 2 });
		expect(r.body).toMatchObject({ eligible: 3, minted: 2, sent: 2, remaining: 1 });
	});


	async function post(raw: string, auth = true) {
		const res = await send('/api/ci/monthly-run', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer admin_test' } : {}) },
			body: raw,
		});
		return { status: res.status, body: (await res.json()) as any };
	}

	it('treats anything but a confirmed, non-dry request as a dry run: nothing is minted, sent or stored', async () => {
		const cases = [
			'not json at all',
			'',
			'null',
			'[]',
			'{}',
			'{"month":"2026-10"}',
			'{"dry_run":false}',
			'{"confirm":"send"}',
			'{"confirm":"yes","dry_run":false}',
			'{"confirm":"SEND","dry_run":false}',
			'{"confirm":"send","dry_run":"false"}',
			'{"confirm":true,"dry_run":false}',
			'{"confirm":"send","dry_run":true}',
		];
		for (const raw of cases) {
			contacts(rows);
			const r = await post(raw);
			expect(r.body.dry_run, raw).toBe(true);
			expect(r.body.sent, raw).toBe(0);
			expect(r.body.minted, raw).toBe(0);
		}
		expect(log.stripe).toHaveLength(0);
		expect(log.batches).toHaveLength(0);
		expect((await env.EMAIL_SUBS.list()).keys).toHaveLength(0);
	});

	it('a confirmed request with dry_run false really sends', async () => {
		contacts([rows[0]]); mint(1); batch();
		const r = await post('{"confirm":"send","dry_run":false,"month":"2026-10"}');
		expect(r.body).toMatchObject({ dry_run: false, minted: 1, sent: 1 });
	});

	it('refuses an overlapping run while the month lock is held, and releases it afterwards', async () => {
		await env.EMAIL_SUBS.put('m20lock:2026-10', String(Date.now()), { expirationTtl: 600 });
		const blocked = await real({ month: '2026-10' });
		expect(blocked.status).toBe(409);
		expect(blocked.body).toMatchObject({ ok: false, locked: true });
		expect(log.stripe).toHaveLength(0);
		await env.EMAIL_SUBS.delete('m20lock:2026-10');

		contacts([rows[0]]); mint(1); batch();
		expect((await real({ month: '2026-10' })).status).toBe(200);
		expect(await env.EMAIL_SUBS.get('m20lock:2026-10')).toBeNull();
		// a dry run neither needs nor takes the lock
		await env.EMAIL_SUBS.put('m20lock:2026-11', String(Date.now()), { expirationTtl: 600 });
		contacts(rows);
		expect((await run({ dry_run: true, month: '2026-11' })).status).toBe(200);
		await env.EMAIL_SUBS.delete('m20lock:2026-11');
	});

	it('releases the lock even when the run fails part way', async () => {
		contacts([rows[0]]); mint(1, 400);
		await real({ month: '2026-10' });
		expect(await env.EMAIL_SUBS.get('m20lock:2026-10')).toBeNull();
	});

	it('uses one KV list call for who is sent and reads state only for the addresses it handles', async () => {
		const many = Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, email: `p${i}@example.com`, unsubscribed: false }));
		contacts(many); mint(2); batch();
		await real({ month: '2026-10', limit: 2 });
		contacts(many); mint(2); batch();
		const second = await real({ month: '2026-10', limit: 2 });
		expect(second.body).toMatchObject({ eligible: 6, skipped: 2, minted: 2, sent: 2, remaining: 2 });
		const keys = (await env.EMAIL_SUBS.list()).keys.map((k) => k.name);
		expect(keys.filter((k) => k.startsWith('m20sent:2026-10:'))).toHaveLength(4);
	});

	it('names the month in New York time', () => {
		expect(currentMonth(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
		expect(currentMonth(new Date('2026-11-01T06:00:00Z'))).toBe('2026-11');
		expect(monthName('2026-10')).toBe('October');
	});
});

describe('unsubscribe link', () => {
	const path = async (email: string, sig?: string) =>
		`/api/ci/unsubscribe?${new URLSearchParams({ e: email, s: sig ?? (await signUnsubscribe('confirm_secret_test', email)) }).toString()}`;
	function patch() {
		fetchMock.get(RESEND).intercept({ method: 'PATCH', path: `/audiences/${AUD}/contacts/ana%40example.com` })
			.reply(200, (o: any) => { log.patches.push(JSON.parse(String(o.body))); return { id: 'c1' }; });
	}

	it('GET only shows a button; POST unsubscribes', async () => {
		const get = await send(await path('ana@example.com'), { method: 'GET' });
		expect(get.status).toBe(200);
		expect(await get.text()).toContain('<form method="post"');
		expect(log.patches).toHaveLength(0);

		patch();
		const post = await send('/api/ci/unsubscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ e: 'ana@example.com', s: await signUnsubscribe('confirm_secret_test', 'ana@example.com') }).toString(),
		});
		expect(post.status).toBe(200);
		expect(log.patches).toEqual([{ unsubscribed: true }]);
	});

	it('accepts a one-click POST from a mail client (address and signature in the query)', async () => {
		patch();
		const res = await send(await path('ana@example.com'), {
			method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
		});
		expect(res.status).toBe(200);
		expect(log.patches).toEqual([{ unsubscribed: true }]);
	});

	it('rejects a tampered or foreign signature', async () => {
		expect((await send(await path('ana@example.com', 'a'.repeat(64)), { method: 'GET' })).status).toBe(400);
		const other = await path('ana@example.com');
		expect((await send(other.replace('ana%40', 'bob%40'), { method: 'POST' })).status).toBe(400);
		expect((await send('/api/ci/unsubscribe', { method: 'GET' })).status).toBe(400);
	});
});
