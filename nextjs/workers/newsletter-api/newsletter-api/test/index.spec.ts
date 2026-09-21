import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from '../src';

const ADMIN_TOKEN = 'test-admin-token';
const RESEND_ORIGIN = 'https://api.resend.com';
const AUDIENCE = 'aud_test';

// Same shape as production, with throwaway values. No real code or key here.
function testEnv(overrides: Record<string, unknown> = {}): Env {
	return Object.assign({}, env, {
		ADMIN_TOKEN,
		RESEND_API_KEY: 're_test_key',
		RESEND_AUDIENCE_ID: AUDIENCE,
		CI_NEWSLETTER_COUPON: 'TESTCODE',
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
const sent: { contacts: any[]; emails: any[] } = { contacts: [], emails: [] };

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

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(async () => {
	await env.EMAIL_SUBS.delete('reader@example.com');
	sent.contacts.length = 0;
	sent.emails.length = 0;
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
		interceptEmails();

		expect((await subscribe('reader@example.com', 'miamicontactimprov:fundamentals')).status).toBe(200);
		// A second signup from the same site must not send a second welcome.
		expect((await subscribe('reader@example.com', 'miamicontactimprov:es')).status).toBe(200);

		expect(sent.contacts).toHaveLength(2);
		expect(sent.emails).toHaveLength(1);

		const mail = sent.emails[0];
		expect(mail.from).toBe('Contact Improv Miami <hello@miamicontactimprov.com>');
		expect(mail.to).toEqual(['reader@example.com']);
		expect(mail.text).toContain('TESTCODE');
		expect(mail.text).toContain('https://miamicontactimprov.com/fundamentals');
		expect(mail.text.match(/https?:\/\//g) ?? []).toHaveLength(1);
		expect(mail.text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(120);
	});

	it('keeps serving the subscriber when Resend fails', async () => {
		interceptContacts(500);

		const { status, body } = await subscribe('reader@example.com', 'maxpetrusenko.com:footer');
		expect(status).toBe(200);
		expect(body.ok).toBe(true);
	});
});
