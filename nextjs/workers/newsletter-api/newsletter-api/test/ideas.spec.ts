import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';
import { IDEAS } from '../src/ideas';

async function call(path: string, init: RequestInit = {}, headers: Record<string, string> = {}) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(
		new Request(`https://newsletter.test${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...headers } }),
		Object.assign({}, env, { ADMIN_TOKEN: 'admin-test', RESEND_API_KEY: undefined }) as unknown as Env,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return { status: res.status, body: (await res.json()) as any };
}
const post = (path: string, body: unknown, headers: Record<string, string> = {}) => call(path, { method: 'POST', body: JSON.stringify(body) }, headers);
const admin = { Authorization: 'Bearer admin-test' };

describe('/api/ideas', () => {
	it('lists every idea with zero counts and its threshold', async () => {
		const { status, body } = await call('/api/ideas');
		expect(status).toBe(200);
		expect(body.ideas.map((i: any) => i.id)).toEqual(IDEAS.map((i) => i.id));
		const parents = body.ideas.find((i: any) => i.id === 'parents-kids');
		expect(parents).toEqual({ id: 'parents-kids', count: 0, threshold: 10, needed: 10, kids: 0 });
		expect(body.ideas[0]).not.toHaveProperty('kids');
	});

	it('one row per person: a repeat click updates the level instead of counting twice', async () => {
		const first = await post('/api/ideas/interest', { idea: 'ci-acro', email: 'A@Example.com', consent: true, ref: 'max' });
		expect(first.body.idea).toMatchObject({ count: 1, needed: 19 });
		expect(first.body.share_ref).toMatch(/^i[0-9a-f]{8}$/);
		const again = await post('/api/ideas/interest', { idea: 'ci-acro', email: 'a@example.com', consent: true, level: 'definitely' });
		expect(again.body.idea.count).toBe(1);
		const row = JSON.parse((await env.IDEAS.get('interest:ci-acro:a@example.com')) ?? '{}');
		expect(row).toMatchObject({ level: 'definitely', ref: 'max', weight: 1 });
		const list = await call('/api/ideas');
		expect(list.body.ideas.find((i: any) => i.id === 'ci-acro').count).toBe(1);
	});

	it('parents CI counts families and kids', async () => {
		await post('/api/ideas/interest', { idea: 'parents-kids', email: 'p1@example.com', consent: true, adults: 2, kids: 2 });
		const r = await post('/api/ideas/interest', { idea: 'parents-kids', email: 'p2@example.com', consent: true, adults: 1, kids: 3 });
		expect(r.body.idea).toEqual({ id: 'parents-kids', count: 2, threshold: 10, needed: 8, kids: 5 });
	});

	it('past ticket buyers weigh 2 internally; the public number stays people', async () => {
		await env.EMAIL_SUBS.put('buyer@example.com', JSON.stringify({ first_discount_claimed: true }));
		const r = await post('/api/ideas/interest', { idea: 'extended-jam', email: 'buyer@example.com', consent: true });
		expect(r.body.idea.count).toBe(1);
		expect(JSON.parse((await env.IDEAS.get('interest:extended-jam:buyer@example.com')) ?? '{}').weight).toBe(2);
	});

	it('validates idea, email, consent; honeypot stores nothing', async () => {
		expect((await post('/api/ideas/interest', { idea: 'nope', email: 'a@example.com', consent: true })).status).toBe(400);
		expect((await post('/api/ideas/interest', { idea: 'ci-acro', email: 'bad', consent: true })).status).toBe(400);
		expect((await post('/api/ideas/interest', { idea: 'ci-acro', email: 'a@example.com' })).status).toBe(400);
		await post('/api/ideas/interest', { idea: 'ci-acro', email: 'bot@example.com', consent: true, company: 'x' });
		expect(await env.IDEAS.get('interest:ci-acro:bot@example.com')).toBeNull();
	});

	it('suggestions stay hidden until an admin approves them, then take interest', async () => {
		expect((await post('/api/ideas/suggest', { title: 'Contact + Yoga', detail: 'Sunday mornings', email: 's@example.com' })).status).toBe(200);
		expect((await call('/api/ideas')).body.suggestions).toEqual([]);
		expect((await call('/api/ideas/suggestions')).status).toBe(401);
		const pending = await call('/api/ideas/suggestions', {}, admin);
		const id = pending.body.suggestions[0].id;
		expect(pending.body.suggestions[0].status).toBe('pending');
		expect((await post('/api/ideas/interest', { idea: id, email: 'x@example.com', consent: true })).status).toBe(400);
		expect((await post('/api/ideas/suggestions/approve', { id })).status).toBe(401);
		expect((await post('/api/ideas/suggestions/approve', { id }, admin)).status).toBe(200);
		const pub = (await call('/api/ideas')).body.suggestions;
		expect(pub).toEqual([{ id, count: 0, threshold: 20, needed: 20, title: 'Contact + Yoga', detail: 'Sunday mornings' }]);
		expect(JSON.stringify(pub)).not.toContain('s@example.com');
		const vote = await post('/api/ideas/interest', { idea: id, email: 'x@example.com', consent: true });
		expect(vote.body.idea.count).toBe(1);
	});
});
