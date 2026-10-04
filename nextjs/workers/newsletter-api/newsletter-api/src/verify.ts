/**
 * Community $15: verify the share instead of trusting it (Max, 2026-10-04).
 *
 * POST /api/community/verify { email, share_url?, screenshot?, company? }
 *   share_url   the buyer's post or reshare. The Worker fetches it and reads
 *               og:title, og:description, <title> and body text.
 *   screenshot  a data:image/...;base64 URL, used when the post is an image or
 *               the page is behind a login (Instagram, Facebook). Read by a
 *               Workers AI vision model; the keyword check runs on the text it
 *               returns, never on the model's own yes or no.
 * A pass mentions one of KEYWORDS. Every attempt, pass or fail, is kept as
 * evidence in COMMUNITY KV for admin review (GET /api/community/evidence).
 * One post (URL hash) or one screenshot (image hash) belongs to the first
 * email that verified it; another email gets reason "used".
 *
 * The checkout then takes { ticket_type: 'community', email, verification_id }
 * and writes share_url, verified=true and method=url|ocr into Stripe metadata.
 */

import type { Env } from './index';
import { isValidEmail, normalizeEmail } from './tickets';

// Most specific first, so the evidence names the strongest match.
export const KEYWORDS = ['miamicontactimprov', 'ci miami', 'contact improvisation', 'contact improv', 'contactimprov'];

// Verified evidence is good for a checkout for a day; after that, verify again.
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_HTML_BYTES = 400_000;
const MAX_IMAGE_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 8000;
const OCR_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const OCR_PROMPT =
	'Transcribe all text visible in this screenshot of a social media post, including captions, stickers, hashtags and links. Reply with the text only.';

// Our own pages are what people share, not proof that they shared them.
const OWN_HOSTS = ['miamicontactimprov.com', 'www.miamicontactimprov.com', 'luma.com', 'lu.ma'];
const TRACKING_PARAMS = /^(utm_.*|fbclid|gclid|igsh|igshid|si|mibextid|ref|ref_src|s|t)$/i;

export interface CommunityKV {
	get(key: string): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
	list(options: { prefix: string; cursor?: string }): Promise<{ keys: Array<{ name: string }>; list_complete: boolean; cursor?: string }>;
}

export interface AiBinding {
	run(model: string, input: unknown): Promise<unknown>;
}

export interface Evidence {
	id: string;
	email: string;
	method: 'url' | 'ocr';
	share_url?: string;
	content_hash: string;
	verified: boolean;
	reason?: string;
	matched?: string;
	excerpt: string;
	ts: number;
}

export function matchKeyword(text: string): string | null {
	const flat = text.toLowerCase().replace(/\s+/g, ' ');
	return KEYWORDS.find((k) => flat.includes(k)) ?? null;
}

export function normalizeShareUrl(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
	const host = url.hostname.toLowerCase();
	if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host === 'localhost') return null;
	if (OWN_HOSTS.includes(host)) return null;
	url.hash = '';
	for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
	url.hostname = host;
	const out = url.toString();
	return out.endsWith('/') && url.pathname !== '/' ? out.slice(0, -1) : out;
}

export async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
	const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&#x27;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function extractPageText(html: string): string {
	const metas: string[] = [];
	for (const m of html.matchAll(/<meta\s[^>]*>/gi)) {
		const tag = m[0];
		const name = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? '';
		if (['og:title', 'og:description', 'twitter:title', 'twitter:description', 'description'].includes(name)) {
			const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
			if (content) metas.push(content);
		}
	}
	const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '';
	const body = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ');
	return decodeEntities([...metas, title, body].join(' ')).replace(/\s+/g, ' ').trim();
}

type FetchResult = { status: 'ok'; text: string } | { status: 'blocked'; detail: string };

export async function fetchPostText(url: string): Promise<FetchResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; MiamiContactImprovBot/1.0; +https://miamicontactimprov.com)',
				Accept: 'text/html,application/xhtml+xml',
			},
		});
		if (!res.ok) return { status: 'blocked', detail: `http ${res.status}` };
		if (/\/(accounts\/)?login|\/checkpoint|\/signin/i.test(new URL(res.url || url).pathname)) return { status: 'blocked', detail: 'login wall' };
		const type = res.headers.get('content-type') ?? '';
		if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) return { status: 'blocked', detail: `content-type ${type}` };
		const buf = await res.arrayBuffer();
		const html = new TextDecoder().decode(buf.slice(0, MAX_HTML_BYTES));
		const text = extractPageText(html);
		return text ? { status: 'ok', text } : { status: 'blocked', detail: 'empty page' };
	} catch (error) {
		return { status: 'blocked', detail: String(error).slice(0, 80) };
	} finally {
		clearTimeout(timer);
	}
}

function parseDataUrl(raw: unknown): { mime: string; bytes: Uint8Array; dataUrl: string } | null {
	if (typeof raw !== 'string') return null;
	const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(raw);
	if (!m) return null;
	const bin = atob(m[2]);
	if (bin.length > MAX_IMAGE_BYTES) return null;
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return { mime: m[1], bytes, dataUrl: raw };
}

export async function ocrScreenshot(ai: AiBinding, dataUrl: string): Promise<string> {
	const out = (await ai.run(OCR_MODEL, {
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: OCR_PROMPT },
					{ type: 'image_url', image_url: { url: dataUrl } },
				],
			},
		],
		max_tokens: 600,
	})) as { response?: unknown } | string;
	if (typeof out === 'string') return out;
	return typeof out?.response === 'string' ? out.response : JSON.stringify(out?.response ?? '');
}

type Cors = Record<string, string>;
const json = (body: unknown, status: number, cors: Cors) => Response.json(body, { status, headers: cors });

async function owner(kv: CommunityKV, key: string): Promise<string | null> {
	const raw = await kv.get(key);
	return raw ? ((JSON.parse(raw) as { email?: string }).email ?? null) : null;
}

export async function handleCommunity(request: Request, env: Env, url: URL, cors: Cors, isAdmin: boolean): Promise<Response | null> {
	if (!url.pathname.startsWith('/api/community')) return null;
	const kv = env.COMMUNITY;
	if (!kv) return json({ ok: false, error: 'Verification not configured' }, 500, cors);

	if (url.pathname === '/api/community/evidence' && request.method === 'GET') {
		if (!isAdmin) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
		const page = await kv.list({ prefix: 'evidence:' });
		const items: Evidence[] = [];
		for (const k of page.keys) {
			const raw = await kv.get(k.name);
			if (raw) items.push(JSON.parse(raw) as Evidence);
		}
		items.sort((a, b) => b.ts - a.ts);
		return json({ evidence: items }, 200, cors);
	}

	if (url.pathname !== '/api/community/verify' || request.method !== 'POST') {
		return json({ ok: false, error: 'Not Found' }, 404, cors);
	}

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
	if (typeof body.company === 'string' && body.company.trim()) return json({ ok: true, verified: false, reason: 'no_match' }, 200, cors);

	const email = normalizeEmail(body.email);
	if (!isValidEmail(email)) return json({ ok: false, error: 'Invalid email' }, 400, cors);
	const shareUrl = body.share_url ? normalizeShareUrl(body.share_url) : null;
	if (body.share_url && !shareUrl) return json({ ok: true, verified: false, reason: 'bad_url' }, 200, cors);
	const image = body.screenshot ? parseDataUrl(body.screenshot) : null;
	if (body.screenshot && !image) return json({ ok: true, verified: false, reason: 'bad_image' }, 200, cors);
	if (!shareUrl && !image) return json({ ok: false, error: 'Add the link to your post or a screenshot' }, 400, cors);

	const method: 'url' | 'ocr' = image ? 'ocr' : 'url';
	const urlHash = shareUrl ? await sha256Hex(shareUrl) : null;
	const imgHash = image ? await sha256Hex(image.bytes.buffer as ArrayBuffer) : null;
	const contentHash = (method === 'ocr' ? imgHash : urlHash)!;

	const evidence: Evidence = {
		id: `v${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
		email,
		method,
		...(shareUrl ? { share_url: shareUrl } : {}),
		content_hash: contentHash,
		verified: false,
		excerpt: '',
		ts: Date.now(),
	};

	const finish = async (verified: boolean, reason: string | undefined, text: string, matched?: string | null) => {
		evidence.verified = verified;
		if (reason) evidence.reason = reason;
		if (matched) evidence.matched = matched;
		evidence.excerpt = text.slice(0, 400);
		await kv.put(`evidence:${evidence.id}`, JSON.stringify(evidence));
		if (verified) {
			if (urlHash) await kv.put(`post:${urlHash}`, JSON.stringify({ email, evidence: evidence.id }));
			if (imgHash) await kv.put(`img:${imgHash}`, JSON.stringify({ email, evidence: evidence.id }));
			return json({ ok: true, verified: true, verification_id: evidence.id, method }, 200, cors);
		}
		return json({ ok: true, verified: false, reason, screenshot_ok: Boolean(env.AI) }, 200, cors);
	};

	// One post, one screenshot: whoever verified it first keeps it.
	for (const key of [urlHash && `post:${urlHash}`, imgHash && `img:${imgHash}`]) {
		if (!key) continue;
		const who = await owner(kv, key);
		if (who && who !== email) return finish(false, 'used', '');
	}

	if (method === 'url') {
		const fetched = await fetchPostText(shareUrl!);
		if (fetched.status === 'blocked') return finish(false, 'blocked', fetched.detail);
		const matched = matchKeyword(fetched.text);
		return finish(Boolean(matched), matched ? undefined : 'no_match', fetched.text, matched);
	}

	if (!env.AI) return finish(false, 'ocr_unavailable', '');
	let text = '';
	try {
		text = await ocrScreenshot(env.AI, image!.dataUrl);
	} catch (error) {
		console.error('[OCR failed]', error);
		return finish(false, 'ocr_failed', String(error).slice(0, 200));
	}
	const matched = matchKeyword(text);
	return finish(Boolean(matched), matched ? undefined : 'no_match', text, matched);
}

/** For checkout: the verified evidence this email may use for a $15 community ticket. */
export async function usableEvidence(env: Env, id: unknown, email: string, nowMs: number): Promise<Evidence | null> {
	if (!env.COMMUNITY || typeof id !== 'string' || !/^v[a-z0-9]{8,30}$/.test(id)) return null;
	const raw = await env.COMMUNITY.get(`evidence:${id}`);
	if (!raw) return null;
	const ev = JSON.parse(raw) as Evidence;
	if (!ev.verified || ev.email !== email || nowMs - ev.ts > VERIFICATION_TTL_MS) return null;
	return ev;
}
