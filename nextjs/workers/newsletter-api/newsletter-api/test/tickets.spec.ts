import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import worker from '../src';
import { verifyStripeSignature } from '../src/stripe-webhook';
import { buildIcs, buildTicketEmail, googleCalendarUrl } from '../src/ticket-email';
import { ensureTicket, listTicketIdsForDate, ticketIdFor } from '../src/tickets';
import { qrPng } from '../src/qr';
import { EVENTS } from '../src/schedule';

const WHSEC = 'whsec_test_secret';
const TICKET_SECRET = 'ticket-secret-for-tests';
const SESSION_ID = 'cs_test_a1B2c3D4e5F6g7H8i9';
const STRIPE = 'https://api.stripe.com';
const RESEND = 'https://api.resend.com';

function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, {
		STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 're_test', STRIPE_WEBHOOK_SECRET: WHSEC, TICKET_SECRET,
	}, overrides) as unknown as Env;
}

function session(overrides: Record<string, unknown> = {}) {
	return {
		id: SESSION_ID,
		payment_status: 'paid',
		amount_total: 2000,
		currency: 'usd',
		customer_details: { name: 'Ana  Maria Lopez', email: 'Ana@Example.com', phone: '+13055550100' },
		metadata: { class_date: '2026-11-20', kind: 'class', product: 'ci-class' },
		...overrides,
	};
}

async function sign(body: string, secret = WHSEC, t = Math.floor(Date.now() / 1000)): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
	const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
	return `t=${t},v1=${hex}`;
}

async function webhook(event: unknown, e: Env = testEnv(), header?: string) {
	const body = JSON.stringify(event);
	const ctx = createExecutionContext();
	const res = await worker.fetch(
		new Request('https://newsletter.test/api/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': header ?? (await sign(body)) }, body }),
		e,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return { status: res.status, body: (await res.json()) as any };
}

const completed = (s: unknown = session()) => ({ id: 'evt_1', type: 'checkout.session.completed', data: { object: s } });

const sentEmails: any[] = [];
const resendHeaders: Array<Record<string, string>> = [];
function interceptResend() {
	fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails' }).reply(200, (opts: any) => {
		sentEmails.push(JSON.parse(String(opts.body)));
		resendHeaders.push(opts.headers as Record<string, string>);
		return { id: 'email_123' };
	});
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
beforeEach(() => {
	sentEmails.length = 0;
	resendHeaders.length = 0;
});
afterEach(async () => {
	fetchMock.assertNoPendingInterceptors();
	const e = testEnv();
	const listed = await e.TICKETS!.list();
	for (const k of listed.keys) await e.TICKETS!.delete(k.name);
});

describe('verifyStripeSignature', () => {
	const body = '{"a":1}';
	it('accepts a valid signature', async () => {
		expect(await verifyStripeSignature(body, await sign(body), WHSEC)).toBe(true);
	});
	it('rejects a wrong secret, a tampered body, a stale timestamp, and junk', async () => {
		expect(await verifyStripeSignature(body, await sign(body, 'whsec_other'), WHSEC)).toBe(false);
		expect(await verifyStripeSignature('{"a":2}', await sign(body), WHSEC)).toBe(false);
		const old = Math.floor(Date.now() / 1000) - 3600;
		expect(await verifyStripeSignature(body, await sign(body, WHSEC, old), WHSEC)).toBe(false);
		expect(await verifyStripeSignature(body, null, WHSEC)).toBe(false);
		expect(await verifyStripeSignature(body, 't=1,v1=zz', WHSEC)).toBe(false);
	});
	it('accepts when any of several v1 entries matches (secret rotation)', async () => {
		const good = await sign(body);
		expect(await verifyStripeSignature(body, `${good},v1=${'0'.repeat(64)}`, WHSEC)).toBe(true);
	});
});

describe('webhook -> ticket -> email', () => {
	it('rejects a bad signature without touching KV', async () => {
		const res = await webhook(completed(), testEnv(), 't=1,v1=00');
		expect(res.status).toBe(400);
		expect((await testEnv().TICKETS!.list()).keys).toHaveLength(0);
	});

	it('creates the ticket, the date index entry, and sends one email', async () => {
		interceptResend();
		const e = testEnv();
		const res = await webhook(completed(), e);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, created: true, email: 'sent' });

		const id = await ticketIdFor(TICKET_SECRET, SESSION_ID);
		expect(res.body.ticket_id).toBe(id);
		expect(id).toMatch(/^[0-9a-f]{32}$/);
		const stored = JSON.parse((await e.TICKETS!.get(`tkt:${id}`))!);
		expect(stored).toMatchObject({
			id, session_id: SESSION_ID, name: 'Ana Maria Lopez', email: 'ana@example.com', phone: '+13055550100',
			event_date: '2026-11-20', kind: 'class', amount: 2000, currency: 'usd', checked_in_at: null, email_id: 'email_123',
		});
		expect(stored.email_sent_at).toBeTruthy();
		expect(await listTicketIdsForDate(e, '2026-11-20')).toEqual([id]);
		expect(sentEmails).toHaveLength(1);
		expect(resendHeaders[0]['idempotency-key'] ?? resendHeaders[0]['Idempotency-Key']).toBe(`ci-ticket-email-${id}`);
	});

	it('is idempotent: a redelivered event creates no second ticket and no second email', async () => {
		interceptResend();
		const e = testEnv();
		await webhook(completed(), e);
		const again = await webhook(completed(), e);
		expect(again.body).toMatchObject({ ok: true, created: false, email: 'already_sent' });
		expect((await e.TICKETS!.list({ prefix: 'tkt:' })).keys).toHaveLength(1);
		expect(sentEmails).toHaveLength(1);
	});

	it('retries the email (500, then success) when Resend fails, without a duplicate ticket', async () => {
		fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails' }).reply(500, { message: 'boom' });
		const e = testEnv();
		const first = await webhook(completed(), e);
		expect(first.status).toBe(500);
		interceptResend();
		const second = await webhook(completed(), e);
		expect(second.body).toMatchObject({ ok: true, created: false, email: 'sent' });
		expect((await e.TICKETS!.list({ prefix: 'tkt:' })).keys).toHaveLength(1);
	});

	it('records a permanent Resend rejection on the ticket and answers 200 so Stripe stops retrying', async () => {
		fetchMock.get(RESEND).intercept({ method: 'POST', path: '/emails' }).reply(422, { message: 'Invalid `to` field' });
		const e = testEnv();
		const res = await webhook(completed(), e);
		expect(res.status).toBe(200);
		expect(res.body.email).toBe('failed');
		const stored = JSON.parse((await e.TICKETS!.get(`tkt:${res.body.ticket_id}`))!);
		expect(stored.email_error).toContain('422');
		expect(stored.email_sent_at).toBeNull();
	});

	it('ignores other event types, unpaid sessions, and sessions that are not class checkouts', async () => {
		const e = testEnv();
		expect((await webhook({ id: 'evt_2', type: 'charge.succeeded', data: { object: {} } }, e)).body.ignored).toBe('charge.succeeded');
		expect((await webhook(completed(session({ payment_status: 'unpaid' })), e)).body.skipped).toBe('not paid');
		expect((await webhook(completed(session({ metadata: {} })), e)).body.skipped).toBe('no class_date metadata');
		expect((await e.TICKETS!.list()).keys).toHaveLength(0);
	});
});

describe('GET /api/ticket', () => {
	function lookup(sessionId: string, e: Env = testEnv()) {
		return (async () => {
			const ctx = createExecutionContext();
			const res = await worker.fetch(new Request(`https://newsletter.test/api/ticket?session_id=${sessionId}`), e, ctx);
			await waitOnExecutionContext(ctx);
			return { status: res.status, body: (await res.json()) as any };
		})();
	}
	const interceptSession = (body: unknown, status = 200) =>
		fetchMock.get(STRIPE).intercept({ method: 'GET', path: `/v1/checkout/sessions/${SESSION_ID}` }).reply(status, body as object);

	it('confirms payment with Stripe, creates the ticket if the webhook has not, returns the QR', async () => {
		interceptSession(session());
		const res = await lookup(SESSION_ID);
		const id = await ticketIdFor(TICKET_SECRET, SESSION_ID);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, paid: true, ticket_id: id, checkin_url: `https://miamicontactimprov.com/checkin/${id}` });
		expect(res.body.qr_svg).toContain('<svg');
		expect(res.body.email).toBeUndefined();
		expect(res.body.phone).toBeUndefined();
	});

	it('returns the same ticket when the webhook already made it', async () => {
		interceptResend();
		const e = testEnv();
		await webhook(completed(), e);
		interceptSession(session());
		const res = await lookup(SESSION_ID, e);
		expect(res.body.ticket_id).toBe(await ticketIdFor(TICKET_SECRET, SESSION_ID));
		expect((await e.TICKETS!.list({ prefix: 'tkt:' })).keys).toHaveLength(1);
	});

	it('402 for an unpaid session, 404 for unknown, 400 for a malformed id', async () => {
		interceptSession(session({ payment_status: 'unpaid' }));
		expect((await lookup(SESSION_ID)).status).toBe(402);
		interceptSession({ error: { message: 'No such session' } }, 404);
		expect((await lookup(SESSION_ID)).status).toBe(404);
		expect((await lookup('nope')).status).toBe(400);
	});
});

describe('email payload', () => {
	it('carries class, time, venue, what to bring, QR cid, ics and a calendar link', async () => {
		const e = testEnv({ CHECKIN_BASE_URL: 'https://x.test/c/' });
		const result = await ensureTicket(e, session() as any);
		if ('skip' in result) throw new Error('skipped');
		const event = EVENTS.find((x) => x.date === '2026-11-20')!;
		const p = await buildTicketEmail(e, result.ticket, event);
		expect(p.to).toEqual(['ana@example.com']);
		expect(p.subject).toContain('2026-11-20');
		expect(p.html).toContain('cid:ticket-qr');
		expect(p.html).toContain('Friday, November 20, 2026, 7:00 PM to 9:00 PM');
		expect(p.html).toContain('216 NE 1st Ave');
		expect(p.text).toContain('Bring water');
		expect(p.html).toContain('calendar.google.com/calendar/render');
		const [qr, ics] = p.attachments;
		expect(qr).toMatchObject({ content_id: 'ticket-qr', content_type: 'image/png' });
		expect(atob(qr.content).slice(1, 4)).toBe('PNG');
		const cal = atob(ics.content);
		expect(cal).toContain('DTSTART:20261121T000000Z'); // 7 PM EST = 00:00 UTC next day
		expect(cal).toContain(`UID:${result.ticket.id}@miamicontactimprov.com`);
		expect(cal.split('\r\n').every((l) => l.length <= 75)).toBe(true);
	});

	it('ics and gcal times honour DST (Oct 30 is EDT, UTC-4)', async () => {
		const e = testEnv();
		const r = await ensureTicket(e, session({ metadata: { class_date: '2026-10-30', kind: 'class' } }) as any);
		if ('skip' in r) throw new Error('skipped');
		const event = EVENTS.find((x) => x.date === '2026-10-30')!;
		expect(buildIcs(r.ticket, event)).toContain('DTSTART:20261030T230000Z');
		expect(googleCalendarUrl(r.ticket, event)).toContain('20261030T230000Z%2F20261031T010000Z');
	});

	it('produces a structurally valid PNG', async () => {
		const png = await qrPng('https://miamicontactimprov.com/checkin/abc');
		expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(new TextDecoder().decode(png.slice(12, 16))).toBe('IHDR');
	});
});
