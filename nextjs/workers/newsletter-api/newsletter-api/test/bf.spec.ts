import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from '../src';
import { BF_END, BF_START, bfEmail, bfRun, friendPassesFor, inBfWindow } from '../src/bf';
import { saveTicket, type Ticket } from '../src/tickets';
import { normalizeEmail, sha256Hex } from '../src/common';

const RESEND = 'https://api.resend.com';
const AUD = 'aud_test';

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, { ADMIN_TOKEN: 'admin_test', RESEND_API_KEY: 're_test', RESEND_AUDIENCE_ID: AUD, TICKET_SECRET: 'x' }, overrides) as unknown as Env;
}

function ticket(n: number, email: string, event_date: string): Ticket {
	return { id: String(n).padStart(32, '0'), session_id: `cs_${n}`, name: '', email, phone: '', event_date, kind: 'class', amount: 2000, currency: 'usd', created_at: '', checked_in_at: null, email_sent_at: null, email_id: null, email_error: null };
}

function contacts(rows: Array<Record<string, unknown>>) {
	fetchMock.get(RESEND).intercept({ method: 'GET', path: /^\/audiences\/aud_test\/contacts\?/ }).reply(200, { object: 'list', has_more: false, data: rows });
}

const broadcasts: any[] = [];
function interceptBroadcast(status = 200) {
	fetchMock.get(RESEND).intercept({ method: 'POST', path: '/broadcasts' }).reply(status, (o: any) => {
		broadcasts.push(JSON.parse(String(o.body)));
		return status === 200 ? { id: 'bc_1' } : { message: 'x' };
	});
}

async function seed(e: Env) {
	await saveTicket(e, ticket(1, 'ana@example.com', '2026-11-13'));
	await saveTicket(e, ticket(2, 'Ana+bf@Example.com', '2026-11-20')); // same person
	await saveTicket(e, ticket(3, 'bo@example.com', '2026-10-02'));
	await saveTicket(e, ticket(4, 'gone@example.com', '2026-10-09')); // unsubscribed
	await saveTicket(e, ticket(5, 'future@example.com', '2099-01-01')); // not an attendee yet
	await saveTicket(e, ticket(6, '', '2026-10-16'));
}
const rows = [{ email: 'gone@example.com', unsubscribed: true }, { email: 'ana@example.com', unsubscribed: false }];

const run = async (body: unknown, headers: Record<string, string> = { Authorization: 'Bearer admin_test' }, e = testEnv()) => {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request('https://newsletter.test/api/ci/bf-run', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }), e, ctx);
	await waitOnExecutionContext(ctx);
	return { status: res.status, body: (await res.json()) as any };
};

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
afterEach(() => {
	broadcasts.length = 0;
	fetchMock.assertNoPendingInterceptors();
});

describe('BF window', () => {
	it('is Nov 27 00:00 to Dec 1 23:59:59.999 America/New_York, inclusive', () => {
		expect(BF_START).toBe('2026-11-27T00:00:00-05:00');
		expect(BF_END).toBe('2026-12-01T23:59:59.999-05:00');
		expect(inBfWindow(new Date('2026-11-26T23:59:59.999-05:00'))).toBe(false);
		expect(inBfWindow(new Date('2026-11-27T00:00:00.000-05:00'))).toBe(true);
		expect(inBfWindow(new Date('2026-12-01T23:59:59.999-05:00'))).toBe(true);
		expect(inBfWindow(new Date('2026-12-02T00:00:00.000-05:00'))).toBe(false);
		// the same instants in UTC
		expect(inBfWindow(new Date('2026-11-27T04:59:59Z'))).toBe(false);
		expect(inBfWindow(new Date('2026-11-27T05:00:00Z'))).toBe(true);
	});

	it('mints three passes a month apart, none redeemed', () => {
		const passes = friendPassesFor(new Date('2026-11-30T20:00:00Z'));
		expect(passes.map((p) => p.available_from.slice(0, 10))).toEqual(['2026-11-30', '2026-12-30', '2027-01-30']);
		expect(passes.every((p) => p.redeemed_at === null && p.redeemed_by === null)).toBe(true);
	});
});

describe('bfEmail', () => {
	it('states the offer without a discount claim, carries UTMs and the unsubscribe placeholder', () => {
		const mail = bfEmail();
		expect(mail.text).toContain('one a month for your first three months');
		expect(mail.text).toContain('The prices have not changed');
		expect(mail.html).toContain('utm_campaign=bf-2026');
		expect(mail.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
		expect(mail.html).not.toMatch(/% off|discount/i);
	});
});

describe('POST /api/ci/bf-run', () => {
	it('needs the admin token', async () => {
		expect((await run({}, {})).status).toBe(401);
		expect((await run({}, { Authorization: 'Bearer nope' })).status).toBe(401);
	});

	it('is a dry run by default: counts, a preview, no writes, no Resend call but the contact list', async () => {
		const e = testEnv();
		await seed(e);
		contacts(rows);
		const r = await run({}, undefined, e);
		expect(r.status).toBe(200);
		expect(r.body).toMatchObject({ ok: true, dry_run: true, campaign: 'bf-2026', tickets_scanned: 6, attendees: 2, unsubscribed_excluded: 1, already_queued: 0, would_queue: 2 });
		expect(r.body.preview.subject).toContain('Black Friday');
		expect(r.body.broadcast).toBeUndefined();
		expect(await e.TICKETS!.get(`bfq:${await sha256Hex(normalizeEmail('ana@example.com'))}`)).toBeNull();
	});

	it('treats confirm "send", a missing dry_run flag, or a malformed body as a dry run', async () => {
		const e = testEnv();
		await seed(e);
		for (const body of [{ confirm: 'send', dry_run: false }, { confirm: 'draft' }, { dry_run: false }, 'junk']) {
			contacts(rows);
			expect((await run(body, undefined, e)).body.dry_run).toBe(true);
		}
	});

	it('confirm "draft" queues the attendees and creates exactly one broadcast draft: no send, no schedule, no batch', async () => {
		const e = testEnv();
		await seed(e);
		contacts(rows);
		interceptBroadcast();
		const r = await run({ confirm: 'draft', dry_run: false }, undefined, e);
		expect(r.body).toMatchObject({ ok: true, dry_run: false, queued: 2, broadcast: { id: 'bc_1', created: true } });
		expect(broadcasts).toHaveLength(1);
		const b = broadcasts[0];
		expect(b.audience_id).toBe(AUD);
		expect(b.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
		for (const k of ['send', 'scheduled_at']) expect(k in b).toBe(false);
		const q = JSON.parse((await e.TICKETS!.get(`bfq:${await sha256Hex(normalizeEmail('ana@example.com'))}`))!);
		expect(q).toMatchObject({ status: 'drafted', segment: 'attended', campaign: 'bf-2026' });
		expect(await e.TICKETS!.get(`bfq:${await sha256Hex(normalizeEmail('gone@example.com'))}`)).toBeNull();
	});

	it('a second draft run adds nothing and does not create a second broadcast', async () => {
		const e = testEnv();
		await seed(e);
		contacts(rows);
		interceptBroadcast();
		await run({ confirm: 'draft', dry_run: false }, undefined, e);
		contacts(rows);
		const again = await run({ confirm: 'draft', dry_run: false }, undefined, e);
		expect(again.body).toMatchObject({ ok: true, queued: 0, already_queued: 2, broadcast: { id: 'bc_1', created: false } });
		expect(broadcasts).toHaveLength(1);
	});

	it('reports a Resend refusal without claiming a draft', async () => {
		const e = testEnv();
		await seed(e);
		contacts(rows);
		interceptBroadcast(422);
		const r = await run({ confirm: 'draft', dry_run: false }, undefined, e);
		expect(r.status).toBe(500);
		expect(r.body.broadcast).toEqual({ id: null, created: false });
	});

	it('refuses to run when Resend is not configured', async () => {
		const r = await run({}, undefined, testEnv({ RESEND_API_KEY: undefined }));
		expect(r.status).toBe(500);
		expect(r.body.error).toContain('not configured');
	});

	it('bfRun is the only sender-adjacent code: it never calls /emails', async () => {
		const e = testEnv();
		await seed(e);
		contacts(rows);
		interceptBroadcast();
		await bfRun(e, { confirm: 'draft', dry_run: false });
		// fetchMock.disableNetConnect + no /emails interceptor: any send would have thrown.
		expect(broadcasts).toHaveLength(1);
	});
});
