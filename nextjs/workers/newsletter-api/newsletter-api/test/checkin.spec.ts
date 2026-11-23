import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';
import { classWindow } from '../src/schedule';
import { memberIdFor, getMember, creditsRemaining, type MemberProfile } from '../src/membership';
import { saveTicket, getTicket, type Ticket } from '../src/tickets';
import { normalizeEmail, sha256Hex } from '../src/common';

const TICKET_SECRET = 'ticket_secret_test';
const RESEND = 'https://api.resend.com';
const FRIDAY = '2026-12-04';
const at = (hhmm: string, date = FRIDAY) => new Date(`${date}T${hhmm}:00-05:00`);

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, { TICKET_SECRET, RESEND_API_KEY: 're_test', ADMIN_TOKEN: 'admin_test' }, overrides) as unknown as Env;
}

async function call(path: string, init: RequestInit = {}, e: Env = testEnv()) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request(`https://newsletter.test${path}`, init), e, ctx);
	await waitOnExecutionContext(ctx);
	const text = await res.text();
	return { status: res.status, body: text ? JSON.parse(text) : null };
}
const post = (path: string, payload: unknown, e?: Env) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, e);

async function seedMember(opts: { customer?: string; plan?: 'monthly' | 'yearly'; status?: MemberProfile['status']; credits?: number; periodEnd?: string; email?: string } = {}) {
	const customer = opts.customer ?? 'cus_CK1';
	const id = await memberIdFor(TICKET_SECRET, customer);
	const plan = opts.plan ?? 'monthly';
	const email = opts.email ?? 'ana@example.com';
	const profile: MemberProfile = {
		id, email, name: 'Ana Lopez', phone: '', stripe_customer: customer, stripe_subscription: 'sub_CK1', plan, status: opts.status ?? 'active',
		suspended_reason: null, suspended_at: null, created_at: '2026-11-20T00:00:00.000Z', canceled_at: null, bf: null, friend_passes: [], utm: {}, sessions: [], extra_subscriptions: [],
	};
	await env.TICKETS!.put(`mem:${id}`, JSON.stringify(profile));
	await env.TICKETS!.put(`mememail:${await sha256Hex(normalizeEmail(email))}`, id);
	await env.TICKETS!.put(`memcr:${id}`, JSON.stringify({ member_id: id, plan, invoices: [], period_start: null, period_end: opts.periodEnd ?? '2027-12-01T00:00:00.000Z', updated_at: '' }));
	for (let i = 1; i <= (opts.credits ?? 4); i++) {
		await env.TICKETS!.put(`memcredit:${id}:in_CK.${i}`, JSON.stringify({ id: `in_CK.${i}`, source_invoice: 'in_CK', granted_at: `2026-11-20T00:00:0${i}.000Z`, used_at: null, used_for: null }));
	}
	return id;
}

function ticket(n: number, event_date: string, extra: Partial<Ticket> = {}): Ticket {
	return { id: String(n).padStart(32, 'a'), session_id: `cs_${n}`, name: 'Bo Chen', email: 'bo@example.com', phone: '', event_date, kind: 'class', amount: 2000, currency: 'usd', created_at: '', checked_in_at: null, email_sent_at: null, email_id: null, email_error: null, ...extra };
}

const emails: any[] = [];
function interceptEmail(status = 200) {
	fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails' }).reply(status, (o: any) => {
		emails.push(JSON.parse(String(o.body)));
		return { id: 'em_1' };
	});
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
afterEach(() => {
	emails.length = 0;
	fetchMock.assertNoPendingInterceptors();
	vi.useRealTimers();
});
const clock = (d: Date) => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(d);
};

describe('classWindow', () => {
	it('opens at 6:30 PM Eastern on a class date, closes at 9:00 PM, and is null on other days', () => {
		expect(classWindow(at('18:29'))?.open).toBe(false);
		expect(classWindow(new Date(`${FRIDAY}T18:29:59.999-05:00`))?.open).toBe(false);
		expect(classWindow(at('18:30'))?.open).toBe(true);
		expect(classWindow(at('19:30'))?.open).toBe(true);
		expect(classWindow(at('21:00'))?.open).toBe(true);
		expect(classWindow(new Date(`${FRIDAY}T21:00:01-05:00`))?.open).toBe(false);
		expect(classWindow(at('19:30', '2026-12-05'))).toBeNull();
		expect(classWindow(at('19:30', '2026-12-03'))).toBeNull();
		expect(classWindow(at('19:30'))!.event.date).toBe(FRIDAY);
	});

	it('follows the DST offset: 6:30 PM EDT on a summer Friday', () => {
		const july = '2027-07-09'; // a generated Friday on EDT
		expect(classWindow(new Date(`${july}T18:29:00-04:00`))?.open).toBe(false);
		expect(classWindow(new Date(`${july}T18:30:00-04:00`))?.open).toBe(true);
	});

	it('uses the Eastern calendar day, not UTC: 8 PM Friday ET is already Saturday in UTC', () => {
		expect(classWindow(new Date('2026-12-05T01:00:00Z'))!.event.date).toBe(FRIDAY);
	});
});

describe('POST /api/checkin/member', () => {
	it('is refused outside the class window and says when it opens', async () => {
		const id = await seedMember();
		clock(at('12:00'));
		const r = await post('/api/checkin/member', { member_id: id });
		expect(r.status).toBe(409);
		expect(r.body).toMatchObject({ ok: false, error: 'outside_window', support_email: 'hello@miamicontactimprov.com' });
		expect(r.body.opens_at).toBe(at('18:30').toISOString());
		expect(await creditsRemaining(testEnv(), id)).toBe(4);
		clock(at('12:00', '2026-12-05'));
		expect((await post('/api/checkin/member', { member_id: id })).body.error).toBe('outside_window');
	});

	it('spends a monthly credit once per class date and answers already after that', async () => {
		const id = await seedMember();
		clock(at('19:05'));
		const first = await post('/api/checkin/member', { member_id: id });
		expect(first.status).toBe(200);
		expect(first.body).toMatchObject({ ok: true, already: false, name: 'Ana', plan: 'monthly', event_date: FRIDAY, credits_remaining: 3 });
		const again = await post('/api/checkin/member', { member_id: id });
		expect(again.body).toMatchObject({ ok: true, already: true, credits_remaining: 3 });
		expect(await creditsRemaining(testEnv(), id)).toBe(3);
		// the host admin route sees the same check-in
		const admin = await post('/api/membership/checkin', { member_id: id, date: FRIDAY });
		expect(admin.status).toBe(401);
	});

	it('denies a member with no credits left, with the support address', async () => {
		const id = await seedMember({ credits: 0 });
		clock(at('19:05'));
		const r = await post('/api/checkin/member', { member_id: id });
		expect(r.status).toBe(409);
		expect(r.body).toMatchObject({ ok: false, error: 'no_credits', support_email: 'hello@miamicontactimprov.com' });
	});

	it('denies suspended and canceled members', async () => {
		const sus = await seedMember({ customer: 'cus_S', status: 'suspended', email: 's@example.com' });
		const can = await seedMember({ customer: 'cus_C', status: 'canceled', email: 'c@example.com' });
		clock(at('19:05'));
		expect((await post('/api/checkin/member', { member_id: sus })).body.error).toBe('inactive');
		expect((await post('/api/checkin/member', { member_id: can })).body.error).toBe('inactive');
		expect(await creditsRemaining(testEnv(), sus)).toBe(4);
	});

	it('yearly: one class a week, and nothing after the paid period ends', async () => {
		const id = await seedMember({ customer: 'cus_Y', plan: 'yearly', email: 'y@example.com', credits: 0 });
		clock(at('19:05'));
		const r = await post('/api/checkin/member', { member_id: id });
		expect(r.body).toMatchObject({ ok: true, plan: 'yearly', credits_remaining: null });
		const ended = await seedMember({ customer: 'cus_Y2', plan: 'yearly', email: 'y2@example.com', credits: 0, periodEnd: '2026-11-30T00:00:00.000Z' });
		expect((await post('/api/checkin/member', { member_id: ended })).body.error).toBe('expired');
	});

	it('unknown and malformed tokens are denied without touching anything', async () => {
		clock(at('19:05'));
		expect((await post('/api/checkin/member', { member_id: 'b'.repeat(32) })).status).toBe(404);
		expect((await post('/api/checkin/member', { member_id: 'nope' })).status).toBe(400);
		expect((await post('/api/checkin/member', {})).status).toBe(400);
		expect((await call('/api/checkin/member', { method: 'POST', body: '{' })).status).toBe(400);
	});

	it('is rate limited per token, not per IP', async () => {
		const keys: string[] = [];
		const limiter = { limit: async ({ key }: { key: string }) => { keys.push(key); return { success: key !== `ck:${'c'.repeat(16)}` }; } };
		const e = testEnv({ CHECKOUT_LIMITER: limiter });
		clock(at('19:05'));
		const blocked = await post('/api/checkin/member', { member_id: 'c'.repeat(32) }, e);
		expect(blocked.status).toBe(429);
		await post('/api/checkin/member', { member_id: 'd'.repeat(32) }, e);
		expect(keys).toEqual([`ck:${'c'.repeat(16)}`, `ck:${'d'.repeat(16)}`]);
	});
});

describe('POST /api/checkin/link', () => {
	it('emails an active member one link carrying their token, and only one inside the cooldown', async () => {
		const id = await seedMember();
		interceptEmail();
		const r = await post('/api/checkin/link', { email: 'Ana@Example.com' });
		expect(r.body).toEqual({ ok: true });
		expect(emails).toHaveLength(1);
		expect(emails[0].to).toEqual(['ana@example.com']);
		expect(emails[0].text).toContain(`https://miamicontactimprov.com/checkin?m=${id}`);
		expect(emails[0].text).toContain('hello@miamicontactimprov.com');
		// second request inside the cooldown: same answer, no second email (no interceptor, net is closed)
		expect((await post('/api/checkin/link', { email: 'ana@example.com' })).body).toEqual({ ok: true });
		expect(emails).toHaveLength(1);
	});

	it('answers the same for an address that is not a member, and sends nothing', async () => {
		expect((await post('/api/checkin/link', { email: 'nobody@example.com' })).body).toEqual({ ok: true });
		await seedMember({ customer: 'cus_C2', status: 'canceled', email: 'gone@example.com' });
		expect((await post('/api/checkin/link', { email: 'gone@example.com' })).body).toEqual({ ok: true });
		expect(emails).toHaveLength(0);
	});

	it('rejects an invalid address, and a Resend failure does not change the answer', async () => {
		expect((await post('/api/checkin/link', { email: 'nope' })).status).toBe(400);
		await seedMember();
		interceptEmail(500);
		expect((await post('/api/checkin/link', { email: 'ana@example.com' })).body).toEqual({ ok: true });
	});

	it('is limited per IP', async () => {
		const keys: string[] = [];
		const e = testEnv({ CHECKOUT_LIMITER: { limit: async ({ key }: { key: string }) => { keys.push(key); return { success: false }; } } });
		const r = await call('/api/checkin/link', { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.9' }, body: JSON.stringify({ email: 'a@b.com' }) }, e);
		expect(r.status).toBe(429);
		expect(keys).toEqual(['link:203.0.113.9']);
	});
});

describe('single-class ticket check-in', () => {
	it('reports valid and unused, and whether tonight is its class', async () => {
		const t = ticket(1, FRIDAY);
		await saveTicket(testEnv(), t);
		clock(at('19:00'));
		const r = await call(`/api/checkin/ticket?id=${t.id}`);
		expect(r.body).toMatchObject({ ok: true, valid: true, used: false, name: 'Bo', event_date: FRIDAY, is_tonight: true, window_open: true });
		expect((await call(`/api/checkin/ticket?id=${'f'.repeat(32)}`)).status).toBe(404);
		expect((await call('/api/checkin/ticket?id=zzz')).status).toBe(400);
	});

	it('marks the ticket used inside the window, keeps the email fields, and answers already on a rescan', async () => {
		const t = ticket(2, FRIDAY, { email_sent_at: '2026-11-30T00:00:00.000Z', email_id: 'em_9' });
		await saveTicket(testEnv(), t);
		clock(at('19:10'));
		const first = await post('/api/checkin/ticket', { ticket_id: t.id });
		expect(first.body).toMatchObject({ ok: true, already: false, name: 'Bo', event_date: FRIDAY });
		const stored = (await getTicket(testEnv(), t.id))!;
		expect(stored.checked_in_at).toBe(at('19:10').toISOString());
		expect(stored.email_id).toBe('em_9');
		clock(at('20:30'));
		const again = await post('/api/checkin/ticket', { ticket_id: t.id });
		expect(again.body).toMatchObject({ ok: true, already: true, checked_in_at: at('19:10').toISOString() });
		const status = await call(`/api/checkin/ticket?id=${t.id}`);
		expect(status.body.used).toBe(true);
	});

	it('refuses outside the window and for another date', async () => {
		const t = ticket(3, FRIDAY);
		const other = ticket(4, '2026-12-11');
		await saveTicket(testEnv(), t);
		await saveTicket(testEnv(), other);
		clock(at('17:00'));
		const early = await post('/api/checkin/ticket', { ticket_id: t.id });
		expect(early.status).toBe(409);
		expect(early.body).toMatchObject({ error: 'outside_window', support_email: 'hello@miamicontactimprov.com' });
		clock(at('19:30'));
		const wrong = await post('/api/checkin/ticket', { ticket_id: other.id });
		expect(wrong.body.error).toBe('wrong_date');
		expect((await getTicket(testEnv(), other.id))!.checked_in_at).toBeNull();
		expect((await post('/api/checkin/ticket', { ticket_id: 'f'.repeat(32) })).status).toBe(404);
	});
});
