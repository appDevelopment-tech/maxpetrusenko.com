import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from '../src';
import { reminderRun, reminderEvent, inQuietHours } from '../src/reminder';
import { saveTicket, type Ticket } from '../src/tickets';
import { memberIdFor, type MemberProfile } from '../src/membership';

const TICKET_SECRET = 'test_ticket_secret_remind_abc123';
const RESEND = 'https://api.resend.com';
const FRIDAY = '2026-12-04';
const THU_7PM = new Date('2026-12-03T19:00:00-05:00');

function testEnv(): Env {
	return Object.assign({}, env, { RESEND_API_KEY: 're_x', TICKET_SECRET, ADMIN_TOKEN: 'admin_test' }) as unknown as Env;
}
function ticket(n: number, email: string, extra: Partial<Ticket> = {}): Ticket {
	return { id: String(n).padStart(32, 'b'), session_id: `cs_${n}`, name: 'Bo Chen', email, phone: '', event_date: FRIDAY, kind: 'class', amount: 2000, currency: 'usd', created_at: '', checked_in_at: null, email_sent_at: null, email_id: null, email_error: null, ...extra };
}
async function seedTicket(t: Ticket) {
	await saveTicket(testEnv(), t);
	await env.TICKETS!.put(`date:${t.event_date}:${t.id}`, '1');
}
async function seedMember(customer: string, email: string, status: MemberProfile['status'] = 'active') {
	const id = await memberIdFor(TICKET_SECRET, customer);
	const m: MemberProfile = { id, email, name: 'Mia Park', phone: '', stripe_customer: customer, stripe_subscription: 's', plan: 'yearly', status, suspended_reason: null, suspended_at: null, created_at: '', canceled_at: null, bf: null, friend_passes: [], utm: {}, sessions: [], extra_subscriptions: [] };
	await env.TICKETS!.put(`mem:${id}`, JSON.stringify(m));
	return id;
}
const sent: any[] = [];
function interceptSend(times: number) {
	for (let i = 0; i < times; i++) {
		fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails' }).reply(200, (o: any) => {
			sent.push({ body: JSON.parse(String(o.body)), headers: o.headers });
			return { id: 'em' };
		});
	}
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
afterEach(async () => {
	sent.length = 0;
	fetchMock.assertNoPendingInterceptors();
	for (const k of (await testEnv().TICKETS!.list()).keys) await testEnv().TICKETS!.delete(k.name);
});

describe('reminder helpers', () => {
	it('picks the class 12 to 36 hours out, and flags quiet hours in Eastern time', () => {
		expect(reminderEvent(THU_7PM)?.date).toBe(FRIDAY);
		expect(reminderEvent(new Date('2026-12-02T12:00:00-05:00'))).toBeNull();
		expect(reminderEvent(THU_7PM, '2026-12-11')?.date).toBe('2026-12-11');
		expect(reminderEvent(THU_7PM, '2030-01-01')).toBeNull();
		expect(inQuietHours(new Date('2026-12-03T07:59:00-05:00'))).toBe(true);
		expect(inQuietHours(new Date('2026-12-03T08:00:00-05:00'))).toBe(false);
		expect(inQuietHours(new Date('2026-12-03T21:59:00-05:00'))).toBe(false);
		expect(inQuietHours(new Date('2026-12-03T22:00:00-05:00'))).toBe(true);
	});
});

describe('reminderRun', () => {
	async function seedAll() {
		await seedTicket(ticket(1, 'bo@example.com'));
		await seedTicket(ticket(2, 'gone@example.com', { refunded_at: '2026-12-01T00:00:00Z', refund_reason: 'refund' }));
		await seedTicket(ticket(3, 'Mia.Park@gmail.com'));
		await seedMember('cus_1', 'miapark@gmail.com'); // same person as ticket 3: one email
		await seedMember('cus_2', 'yoga@example.com');
		await seedMember('cus_3', 'off@example.com', 'canceled');
	}

	it('dry run by default: counts, no sends', async () => {
		await seedAll();
		const r = await reminderRun(testEnv(), {}, THU_7PM);
		expect(r).toMatchObject({ ok: true, dry_run: true, date: FRIDAY, ticket_holders: 2, members: 1, skipped_refunded: 1, already_sent: 0, would_send: 3 });
		expect(r.preview?.text).toContain('hello@miamicontactimprov.com');
	});

	it('sends one email per person with the right link, then is idempotent', async () => {
		await seedAll();
		interceptSend(3);
		const r = await reminderRun(testEnv(), { dry_run: false }, THU_7PM);
		expect(r).toMatchObject({ ok: true, dry_run: false, sent: 3, failed: 0 });
		const to = sent.map((s) => s.body.to[0]).sort();
		expect(to).toEqual(['Mia.Park@gmail.com', 'bo@example.com', 'yoga@example.com']);
		const member = sent.find((s) => s.body.to[0] === 'yoga@example.com').body;
		expect(member.text).toContain('/checkin?m=');
		expect(member.text).toContain('7:00 PM to 9:00 PM');
		expect(sent.find((s) => s.body.to[0] === 'bo@example.com').body.text).toContain('/checkin/');
		expect(sent[0].headers['idempotency-key'] ?? sent[0].headers['Idempotency-Key']).toMatch(/^ci-reminder-2026-12-04-/);
		const again = await reminderRun(testEnv(), { dry_run: false }, THU_7PM);
		expect(again).toMatchObject({ sent: 0, already_sent: 3 });
	});

	it('refuses a real send in quiet hours', async () => {
		await seedAll();
		const r = await reminderRun(testEnv(), { dry_run: false, date: FRIDAY }, new Date('2026-12-03T23:00:00-05:00'));
		expect(r.ok).toBe(false);
		expect(r.error).toContain('Quiet hours');
	});

	it('errors when no class is in range', async () => {
		const r = await reminderRun(testEnv(), {}, new Date('2026-12-01T10:00:00-05:00'));
		expect(r.ok).toBe(false);
	});
});

describe('POST /api/ci/reminder-run', () => {
	const run = async (headers: Record<string, string>, body: unknown) => {
		const ctx = createExecutionContext();
		const res = await worker.fetch(new Request('https://newsletter.test/api/ci/reminder-run', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }), testEnv(), ctx);
		await waitOnExecutionContext(ctx);
		return res.status;
	};
	it('needs the admin token', async () => {
		expect(await run({}, {})).toBe(401);
		expect(await run({ Authorization: 'Bearer wrong' }, {})).toBe(401);
		expect(await run({ Authorization: 'Bearer admin_test' }, { date: FRIDAY })).toBe(200);
	});
});
