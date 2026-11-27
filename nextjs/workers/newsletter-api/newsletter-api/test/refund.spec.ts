import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker from '../src';
import { ensureTicket, getTicket, saveTicket, ticketIdFor, type Ticket } from '../src/tickets';

const WHSEC = 'whsec_test_secret';
const TICKET_SECRET = 'test_ticket_secret_refund_abc123';
const STRIPE = 'https://api.stripe.com';
const FRIDAY = '2026-12-04';
const SUPPORT = 'hello@miamicontactimprov.com';

function testEnv(): Env {
	return Object.assign({}, env, { STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 're_x', STRIPE_WEBHOOK_SECRET: WHSEC, TICKET_SECRET, ADMIN_TOKEN: 'admin_test' }) as unknown as Env;
}
const session = (id: string, pi?: string) => ({
	id, payment_status: 'paid', amount_total: 2000, currency: 'usd', payment_intent: pi,
	customer_details: { name: 'Ana Lopez', email: 'ana@example.com', phone: '' },
	metadata: { class_date: FRIDAY, kind: 'class', product: 'ci-class' },
});

async function sign(body: string): Promise<string> {
	const t = Math.floor(Date.now() / 1000);
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(WHSEC), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
	return `t=${t},v1=${Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
async function webhook(event: unknown) {
	const body = JSON.stringify(event);
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request('https://newsletter.test/api/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': await sign(body) }, body }), testEnv(), ctx);
	await waitOnExecutionContext(ctx);
	return { status: res.status, body: (await res.json()) as any };
}
async function call(path: string, init: RequestInit = {}) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request(`https://newsletter.test${path}`, init), testEnv(), ctx);
	await waitOnExecutionContext(ctx);
	return { status: res.status, body: (await res.json()) as any };
}
const checkinPost = (id: string) => call('/api/checkin/ticket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: id }) });

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
afterEach(async () => {
	fetchMock.assertNoPendingInterceptors();
	vi.useRealTimers();
	const e = testEnv();
	for (const k of (await e.TICKETS!.list()).keys) await e.TICKETS!.delete(k.name);
});

describe('single-ticket refunds and disputes', () => {
	it('writes the payment intent index at ticket creation', async () => {
		const r = await ensureTicket(testEnv(), session('cs_test_Refund1abcdefgh', 'pi_R1'));
		expect('ticket' in r && r.ticket.payment_intent).toBe('pi_R1');
		expect(await env.TICKETS!.get('tpay:pi_R1')).toBe(await ticketIdFor(TICKET_SECRET, 'cs_test_Refund1abcdefgh'));
	});

	it('a full refund marks the ticket, and check-in and lookup deny it with the support email', async () => {
		await ensureTicket(testEnv(), session('cs_test_Refund2abcdefgh', 'pi_R2'));
		const id = await ticketIdFor(TICKET_SECRET, 'cs_test_Refund2abcdefgh');
		const res = await webhook({ id: 'evt_r', type: 'charge.refunded', data: { object: { id: 'ch_R2', payment_intent: 'pi_R2', refunded: true } } });
		expect(res.body).toMatchObject({ ok: true, ticket: 'marked', reason: 'refund' });
		expect((await getTicket(testEnv(), id))!.refund_reason).toBe('refund');
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(`${FRIDAY}T19:05:00-05:00`));
		const checkin = await checkinPost(id);
		expect(checkin.status).toBe(403);
		expect(checkin.body).toMatchObject({ ok: false, error: 'ticket_refunded', support_email: SUPPORT });
		const lookup = await call(`/api/checkin/ticket?id=${id}`);
		expect(lookup.body).toMatchObject({ ok: false, valid: false, error: 'ticket_refunded', support_email: SUPPORT });
		expect((await getTicket(testEnv(), id))!.checked_in_at).toBeNull();
		// replay is a no-op
		expect((await webhook({ id: 'evt_r', type: 'charge.refunded', data: { object: { id: 'ch_R2', payment_intent: 'pi_R2', refunded: true } } })).body.ticket).toBe('duplicate');
	});

	it('a partial refund does not mark the ticket', async () => {
		await ensureTicket(testEnv(), session('cs_test_Refund3abcdefgh', 'pi_R3'));
		const id = await ticketIdFor(TICKET_SECRET, 'cs_test_Refund3abcdefgh');
		await webhook({ id: 'evt_p', type: 'charge.refunded', data: { object: { id: 'ch_R3', payment_intent: 'pi_R3', refunded: false } } });
		expect((await getTicket(testEnv(), id))!.refunded_at).toBeNull();
	});

	it('a dispute marks the ticket and the success page stops showing the QR', async () => {
		await ensureTicket(testEnv(), session('cs_test_Refund4abcdefgh', 'pi_R4'));
		const id = await ticketIdFor(TICKET_SECRET, 'cs_test_Refund4abcdefgh');
		const res = await webhook({ id: 'evt_d', type: 'charge.dispute.created', data: { object: { id: 'dp_1', charge: 'ch_R4', payment_intent: 'pi_R4' } } });
		expect(res.body).toMatchObject({ ticket: 'marked', reason: 'dispute' });
		fetchMock.get(STRIPE).intercept({ method: 'GET', path: '/v1/checkout/sessions/cs_test_Refund4abcdefgh' }).reply(200, session('cs_test_Refund4abcdefgh', 'pi_R4'));
		const page = await call('/api/ticket?session_id=cs_test_Refund4abcdefgh');
		expect(page.status).toBe(403);
		expect(page.body).toMatchObject({ ok: false, error: 'ticket_refunded', support_email: SUPPORT });
		expect(page.body.qr_svg).toBeUndefined();
		expect(id).toBeTruthy();
	});

	it('backfill: a ticket with no index is found through the Stripe session for the payment intent', async () => {
		const id = await ticketIdFor(TICKET_SECRET, 'cs_test_Refund5abcdefgh');
		const old: Ticket = { id, session_id: 'cs_test_Refund5abcdefgh', name: 'Bo', email: 'bo@example.com', phone: '', event_date: FRIDAY, kind: 'class', amount: 2000, currency: 'usd', created_at: '', checked_in_at: null, email_sent_at: null, email_id: null, email_error: null };
		await saveTicket(testEnv(), old);
		fetchMock.get(STRIPE).intercept({ method: 'GET', path: '/v1/checkout/sessions?payment_intent=pi_R5&limit=1' }).reply(200, { data: [{ id: 'cs_test_Refund5abcdefgh' }] });
		const res = await webhook({ id: 'evt_b', type: 'charge.refunded', data: { object: { id: 'ch_R5', payment_intent: 'pi_R5', refunded: true } } });
		expect(res.body).toMatchObject({ ticket: 'marked' });
		expect((await getTicket(testEnv(), id))!.refunded_at).toBeTruthy();
		expect(await env.TICKETS!.get('tpay:pi_R5')).toBe(id);
	});

	it('a refund that is not ours falls through to the membership handler', async () => {
		fetchMock.get(STRIPE).intercept({ method: 'GET', path: '/v1/checkout/sessions?payment_intent=pi_X&limit=1' }).reply(200, { data: [] });
		const res = await webhook({ id: 'evt_x', type: 'charge.refunded', data: { object: { id: 'ch_X', payment_intent: 'pi_X', refunded: true } } });
		expect(res.body).toMatchObject({ ok: true, skipped: 'not a CI membership payment' });
	});
});
