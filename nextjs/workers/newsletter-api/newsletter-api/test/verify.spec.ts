import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from '../src';
import { extractPageText, matchKeyword, normalizeShareUrl } from '../src/verify';

const SOCIAL = 'https://social.example';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function fakeAi(text: string | Error) {
	return {
		calls: 0,
		async run(_model: string, input: any) {
			this.calls += 1;
			expect(input.messages[0].content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
			if (text instanceof Error) throw text;
			return { response: text };
		},
	};
}

async function call(path: string, init: RequestInit, overrides: Record<string, unknown> = {}) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(
		new Request(`https://newsletter.test${path}`, init),
		Object.assign({}, env, { ADMIN_TOKEN: 'admin-test', AI: undefined }, overrides) as unknown as Env,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return { status: res.status, body: (await res.json()) as any };
}
const verify = (body: unknown, overrides: Record<string, unknown> = {}) =>
	call('/api/community/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, overrides);

function page(path: string, html: string, status = 200) {
	fetchMock.get(SOCIAL).intercept({ method: 'GET', path }).reply(status, html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});
afterEach(() => fetchMock.assertNoPendingInterceptors());

describe('helpers', () => {
	it('matches the keywords, case and spacing insensitive', () => {
		expect(matchKeyword('Come dance CONTACT   Improv on Friday')).toBe('contact improv');
		expect(matchKeyword('a contact improvisation jam')).toBe('contact improvisation');
		expect(matchKeyword('#contactimprovisation #miami')).toBe('contactimprov');
		expect(matchKeyword('see miamicontactimprov.com/fundamentals')).toBe('miamicontactimprov');
		expect(matchKeyword('CI Miami tonight')).toBe('ci miami');
		expect(matchKeyword('salsa night in Miami')).toBeNull();
	});

	it('normalizes share URLs and refuses our own pages, http and IP hosts', () => {
		expect(normalizeShareUrl('https://WWW.Instagram.com/p/ABC/?igsh=xyz&utm_source=ig#top')).toBe('https://www.instagram.com/p/ABC');
		expect(normalizeShareUrl('https://facebook.com/groups/1/posts/2?fbclid=1&x=2')).toBe('https://facebook.com/groups/1/posts/2?x=2');
		expect(normalizeShareUrl('http://example.org/p')).toBeNull();
		expect(normalizeShareUrl('https://127.0.0.1/p')).toBeNull();
		expect(normalizeShareUrl('https://miamicontactimprov.com/fundamentals')).toBeNull();
		expect(normalizeShareUrl('https://luma.com/hau1fq5t')).toBeNull();
		expect(normalizeShareUrl('not a url')).toBeNull();
	});

	it('reads og tags, title and body text, not scripts', () => {
		const text = extractPageText(
			'<html><head><title>Post</title><meta property="og:description" content="Fridays: Contact &amp; Improv"><script>var contact="improv"</script></head><body><p>Hello</p></body></html>',
		);
		expect(text).toContain('Fridays: Contact & Improv');
		expect(text).toContain('Hello');
		expect(text).not.toContain('var contact');
	});
});

describe('POST /api/community/verify (url)', () => {
	it('passes a post whose og:description mentions contact improv, and keeps the evidence', async () => {
		page('/p/pass', '<meta property="og:description" content="Join me at Contact Improv Miami this Friday!">');
		const r = await verify({ email: 'Me@Example.com', share_url: `${SOCIAL}/p/pass?utm_source=x` });
		expect(r.body).toMatchObject({ ok: true, verified: true, method: 'url' });
		const ev = JSON.parse((await env.COMMUNITY.get(`evidence:${r.body.verification_id}`)) ?? '{}');
		expect(ev).toMatchObject({ email: 'me@example.com', method: 'url', verified: true, matched: 'contact improv', share_url: `${SOCIAL}/p/pass` });
		expect(ev.excerpt).toContain('Contact Improv Miami');
	});

	it('fails a page without the words, and still records the attempt', async () => {
		page('/p/nope', '<title>My lunch</title><p>pasta</p>');
		const r = await verify({ email: 'me@example.com', share_url: `${SOCIAL}/p/nope` });
		expect(r.body).toEqual({ ok: true, verified: false, reason: 'no_match', screenshot_ok: false });
		const list = await call('/api/community/evidence', { headers: { Authorization: 'Bearer admin-test' } });
		expect(list.body.evidence.some((e: any) => e.reason === 'no_match' && e.share_url === `${SOCIAL}/p/nope`)).toBe(true);
	});

	it('reports a login wall or an error page as blocked, so the page offers a screenshot', async () => {
		page('/p/private', 'Forbidden', 403);
		const r = await verify({ email: 'me@example.com', share_url: `${SOCIAL}/p/private` }, { AI: fakeAi('') });
		expect(r.body).toEqual({ ok: true, verified: false, reason: 'blocked', screenshot_ok: true });
	});

	it('one post, one email: a second email cannot reuse a verified post; the first can', async () => {
		page('/p/shared', '<meta property="og:title" content="contact improvisation jam">');
		expect((await verify({ email: 'first@example.com', share_url: `${SOCIAL}/p/shared` })).body.verified).toBe(true);
		const other = await verify({ email: 'second@example.com', share_url: `${SOCIAL}/p/shared#x` });
		expect(other.body).toMatchObject({ verified: false, reason: 'used' });
		page('/p/shared', '<meta property="og:title" content="contact improvisation jam">');
		expect((await verify({ email: 'first@example.com', share_url: `${SOCIAL}/p/shared` })).body.verified).toBe(true);
	});

	it('rejects our own links and bad input', async () => {
		expect((await verify({ email: 'me@example.com', share_url: 'https://miamicontactimprov.com/tickets' })).body.reason).toBe('bad_url');
		expect((await verify({ email: 'bad', share_url: `${SOCIAL}/p/1` })).status).toBe(400);
		expect((await verify({ email: 'me@example.com' })).status).toBe(400);
	});

	it('admin evidence needs the token', async () => {
		expect((await call('/api/community/evidence', {})).status).toBe(401);
	});
});

describe('POST /api/community/verify (screenshot OCR)', () => {
	it('passes when the text read from the screenshot mentions the class', async () => {
		const ai = fakeAi('Story: Contact Improv Miami, Fridays 7pm. miamicontactimprov.com');
		const r = await verify({ email: 'shot@example.com', screenshot: PNG }, { AI: ai });
		expect(r.body).toMatchObject({ ok: true, verified: true, method: 'ocr' });
		expect(ai.calls).toBe(1);
	});

	it('fails when the screenshot text does not mention it', async () => {
		const r = await verify({ email: 'shot2@example.com', screenshot: PNG2 }, { AI: fakeAi('Happy birthday Ana!') });
		expect(r.body).toMatchObject({ verified: false, reason: 'no_match' });
	});

	it('the same screenshot cannot be reused by another email', async () => {
		expect((await verify({ email: 'owner@example.com', screenshot: PNG }, { AI: fakeAi('contact improv') })).body.verified).toBe(true);
		const r = await verify({ email: 'copycat@example.com', screenshot: PNG }, { AI: fakeAi('contact improv') });
		expect(r.body).toMatchObject({ verified: false, reason: 'used' });
	});

	it('OCR errors and a missing AI binding fail softly', async () => {
		const img = PNG2.replace('ADhgGAWjR9awAAAABJRU5ErkJggg', 'ADhgGAWjR9awAAAABJRU5ErkJggA');
		expect((await verify({ email: 'x@example.com', screenshot: img }, { AI: fakeAi(new Error('model down')) })).body.reason).toBe('ocr_failed');
		expect((await verify({ email: 'x@example.com', screenshot: img })).body.reason).toBe('ocr_unavailable');
		expect((await verify({ email: 'x@example.com', screenshot: 'data:text/html;base64,PGI+' })).body.reason).toBe('bad_image');
	});

	it('verified evidence buys a $15 community checkout end to end', async () => {
		const r = await verify({ email: 'e2e@example.com', screenshot: PNG.replace('QDwAEhQGAhKmMIQ', 'QDwAEhQGAhKmMIA') }, { AI: fakeAi('CI Miami') });
		expect(r.body.verified).toBe(true);
		fetchMock.get('https://api.stripe.com').intercept({ method: 'GET', path: /\/v1\/prices\?/ }).reply(200, { data: [{ id: 'price_15', unit_amount: 1500 }] });
		let sent: URLSearchParams | null = null;
		fetchMock
			.get('https://api.stripe.com')
			.intercept({ method: 'POST', path: '/v1/checkout/sessions' })
			.reply(200, (opts: any) => {
				sent = new URLSearchParams(String(opts.body));
				return { url: 'https://checkout.stripe.com/c/pay/cs_test_x' };
			});
		const co = await call(
			'/api/checkout',
			{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_type: 'community', email: 'e2e@example.com', verification_id: r.body.verification_id, event_date: '2026-11-20' }) },
			{ STRIPE_SECRET_KEY: 'sk_test_x' },
		);
		expect(co.status).toBe(200);
		expect(sent!.get('metadata[method]')).toBe('ocr');
		expect(sent!.get('metadata[verified]')).toBe('true');
		expect(sent!.get('metadata[verification_id]')).toBe(r.body.verification_id);
	});
});
