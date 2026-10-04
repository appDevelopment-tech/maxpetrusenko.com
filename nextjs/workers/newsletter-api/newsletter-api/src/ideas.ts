/**
 * /ideas demand board for Contact Improv Miami (slice 3).
 *
 * GET  /api/ideas                     public counters and thresholds
 * POST /api/ideas/interest            { idea, email, consent, level?, adults?, kids?, ref?, company? }
 * POST /api/ideas/suggest             { title, detail?, email, company? }  held for approval
 * GET  /api/ideas/suggestions         admin: pending + approved suggestions
 * POST /api/ideas/suggestions/approve admin: { id }
 *
 * Storage: IDEAS KV.
 *   interest:<idea>:<email>  one row per person per idea (a repeat click updates it)
 *   counts                   cached public numbers, recomputed from the rows of the
 *                            idea that changed, so a lost race heals on the next write
 *   suggestion:<id>          { title, detail, email, status: pending|approved }
 *
 * The public number is people, never weighted. The row keeps an internal
 * weight (2 for someone who has bought a CI ticket, else 1) for Max's ranking.
 */

import type { Env } from './index';
import { isValidEmail, normalizeEmail, normalizeReferrer, readSubscriber } from './tickets';

export interface IdeaDef {
	id: string;
	threshold: number;
	// Parents CI counts families (one row = one family) and reports kids too.
	families?: boolean;
}

// Same ids, same order as build/content_ideas.py in the site repo.
export const IDEAS: IdeaDef[] = [
	{ id: 'ci-acro', threshold: 20 },
	{ id: 'eros-contact', threshold: 20 },
	{ id: 'tantra-bodywork-lab', threshold: 20 },
	{ id: 'parents-kids', threshold: 10, families: true },
	{ id: 'ci-live-music', threshold: 20 },
	{ id: 'outdoor-beach', threshold: 20 },
	{ id: 'extended-jam', threshold: 15 },
];

const LEVELS = ['definitely', 'probably', 'curious'] as const;
type Level = (typeof LEVELS)[number];

interface InterestRow {
	idea: string;
	email: string;
	level?: Level;
	adults?: number;
	kids?: number;
	ref?: string;
	weight: number;
	ts: number;
}

interface CountEntry {
	count: number;
	kids?: number;
	definitely?: number;
}

interface Suggestion {
	id: string;
	title: string;
	detail: string;
	email: string;
	status: 'pending' | 'approved';
	ts: number;
}

// The subset of the KV API this file uses (list with prefix and cursor).
export interface IdeasKV {
	get(key: string): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
	list(options: { prefix: string; cursor?: string }): Promise<{ keys: Array<{ name: string }>; list_complete: boolean; cursor?: string }>;
}

type Cors = Record<string, string>;
const json = (body: unknown, status: number, cors: Cors) => Response.json(body, { status, headers: cors });

function ideaById(id: unknown): IdeaDef | undefined {
	return IDEAS.find((i) => i.id === id);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
	const n = Number.parseInt(String(value ?? ''), 10);
	return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// A short, stable share code per person: shares from their link credit them
// without the address ever appearing in a URL.
export async function shareRef(email: string): Promise<string> {
	return `i${(await sha256Hex(email)).slice(0, 8)}`;
}

async function readCounts(kv: IdeasKV): Promise<Record<string, CountEntry>> {
	const raw = await kv.get('counts');
	try {
		return raw ? (JSON.parse(raw) as Record<string, CountEntry>) : {};
	} catch {
		return {};
	}
}

async function recount(kv: IdeasKV, idea: string): Promise<CountEntry> {
	const entry: CountEntry = { count: 0, kids: 0, definitely: 0 };
	let cursor: string | undefined;
	do {
		const page = await kv.list({ prefix: `interest:${idea}:`, cursor });
		for (const key of page.keys) {
			const raw = await kv.get(key.name);
			if (!raw) continue;
			const row = JSON.parse(raw) as InterestRow;
			entry.count += 1;
			entry.kids! += row.kids ?? 0;
			if (row.level === 'definitely') entry.definitely! += 1;
		}
		cursor = page.list_complete ? undefined : page.cursor;
	} while (cursor);
	const counts = await readCounts(kv);
	counts[idea] = entry;
	await kv.put('counts', JSON.stringify(counts));
	return entry;
}

function publicIdea(def: IdeaDef, entry: CountEntry | undefined) {
	const count = entry?.count ?? 0;
	return {
		id: def.id,
		count,
		threshold: def.threshold,
		needed: Math.max(0, def.threshold - count),
		...(def.families ? { kids: entry?.kids ?? 0 } : {}),
	};
}

export async function handleIdeas(request: Request, env: Env, url: URL, cors: Cors, isAdmin: boolean): Promise<Response | null> {
	if (!url.pathname.startsWith('/api/ideas')) return null;
	const kv = env.IDEAS;
	if (!kv) return json({ ok: false, error: 'Ideas not configured' }, 500, cors);

	if (url.pathname === '/api/ideas' && request.method === 'GET') {
		const counts = await readCounts(kv);
		const approved = await approvedSuggestions(kv);
		return json({ ideas: IDEAS.map((d) => publicIdea(d, counts[d.id])), suggestions: approved }, 200, cors);
	}

	if (url.pathname === '/api/ideas/interest' && request.method === 'POST') {
		const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
		if (!body) return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
		if (typeof body.company === 'string' && body.company.trim()) return json({ ok: true }, 200, cors);

		const def = ideaById(body.idea) ?? (await approvedIdea(kv, body.idea));
		if (!def) return json({ ok: false, error: 'Unknown idea' }, 400, cors);
		const email = normalizeEmail(body.email);
		if (!isValidEmail(email)) return json({ ok: false, error: 'Invalid email' }, 400, cors);
		if (!body.consent) return json({ ok: false, error: 'Consent required' }, 400, cors);
		const level = LEVELS.includes(body.level as Level) ? (body.level as Level) : undefined;

		const key = `interest:${def.id}:${email}`;
		const previous = await kv.get(key);
		const prev = previous ? (JSON.parse(previous) as InterestRow) : null;
		const subscriber = await readSubscriber(env, email);
		const row: InterestRow = {
			idea: def.id,
			email,
			level: level ?? prev?.level,
			ref: prev?.ref ?? normalizeReferrer(body.ref) ?? undefined,
			weight: subscriber?.first_discount_claimed ? 2 : 1,
			ts: prev?.ts ?? Date.now(),
			...(def.families
				? { adults: clampInt(body.adults, 1, 6, prev?.adults ?? 1), kids: clampInt(body.kids, 0, 10, prev?.kids ?? 1) }
				: {}),
		};
		await kv.put(key, JSON.stringify(row));
		const entry = await recount(kv, def.id);
		return json({ ok: true, idea: publicIdea(def, entry), share_ref: await shareRef(email) }, 200, cors);
	}

	if (url.pathname === '/api/ideas/suggest' && request.method === 'POST') {
		const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
		if (!body) return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
		if (typeof body.company === 'string' && body.company.trim()) return json({ ok: true }, 200, cors);
		const title = typeof body.title === 'string' ? body.title.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) : '';
		const detail = typeof body.detail === 'string' ? body.detail.replace(/[\u0000-\u0008]/g, '').trim().slice(0, 500) : '';
		const email = normalizeEmail(body.email);
		if (!title) return json({ ok: false, error: 'Add a title' }, 400, cors);
		if (!isValidEmail(email)) return json({ ok: false, error: 'Invalid email' }, 400, cors);
		const id = `s${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`;
		const suggestion: Suggestion = { id, title, detail, email, status: 'pending', ts: Date.now() };
		await kv.put(`suggestion:${id}`, JSON.stringify(suggestion));
		return json({ ok: true }, 200, cors);
	}

	if (url.pathname === '/api/ideas/suggestions' && request.method === 'GET') {
		if (!isAdmin) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
		return json({ suggestions: await listSuggestions(kv) }, 200, cors);
	}

	if (url.pathname === '/api/ideas/suggestions/approve' && request.method === 'POST') {
		if (!isAdmin) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
		const body = (await request.json().catch(() => ({}))) as { id?: string };
		const raw = body.id ? await kv.get(`suggestion:${body.id}`) : null;
		if (!raw) return json({ ok: false, error: 'Not found' }, 404, cors);
		const suggestion = JSON.parse(raw) as Suggestion;
		suggestion.status = 'approved';
		await kv.put(`suggestion:${suggestion.id}`, JSON.stringify(suggestion));
		return json({ ok: true, id: suggestion.id }, 200, cors);
	}

	return json({ ok: false, error: 'Not Found' }, 404, cors);
}

async function listSuggestions(kv: IdeasKV): Promise<Suggestion[]> {
	const out: Suggestion[] = [];
	const page = await kv.list({ prefix: 'suggestion:' });
	for (const key of page.keys) {
		const raw = await kv.get(key.name);
		if (raw) out.push(JSON.parse(raw) as Suggestion);
	}
	return out;
}

// Approved suggestions become public cards: title and detail only, never the
// suggester's email. They take interest like a built-in idea, threshold 20.
async function approvedSuggestions(kv: IdeasKV) {
	const counts = await readCounts(kv);
	return (await listSuggestions(kv))
		.filter((s) => s.status === 'approved')
		.map((s) => ({ ...publicIdea({ id: s.id, threshold: 20 }, counts[s.id]), title: s.title, detail: s.detail }));
}

async function approvedIdea(kv: IdeasKV, id: unknown): Promise<IdeaDef | undefined> {
	if (typeof id !== 'string' || !/^s[a-z0-9-]{4,40}$/.test(id)) return undefined;
	const raw = await kv.get(`suggestion:${id}`);
	if (!raw) return undefined;
	const s = JSON.parse(raw) as Suggestion;
	return s.status === 'approved' ? { id: s.id, threshold: 20 } : undefined;
}
