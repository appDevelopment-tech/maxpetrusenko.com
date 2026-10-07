/**
 * Monthly 20% campaign: POST /api/ci/monthly-run (admin Bearer, `dry_run` flag).
 *
 * For every Resend contact in the audience that is not unsubscribed it mints a personal
 * single-use 20% promotion code (CI20-XXXXXX, 7 days) on CI_MONTHLY_COUPON_ID and emails
 * it through Resend's batch API. State per (month, address) in KV `m20:<YYYY-MM>:<hash>`
 * makes every rerun safe: a sent address is skipped, an address with a minted but unsent
 * code reuses that code (and the Stripe idempotency key), so nothing double-sends or
 * double-mints. A run handles at most `limit` addresses (default 30, max 90) to stay
 * inside the Worker's subrequest budget; `remaining` says whether to run again.
 * The caller decides when to run (quiet hours).
 *
 * Safety: a real run needs a valid JSON body with `confirm: "send"` AND `dry_run: false`;
 * every other call (malformed body, missing or wrong confirm, dry_run omitted) is a dry
 * run. A KV lock `m20lock:<month>` (600s) stops two runs overlapping, and the batch call
 * carries an Idempotency-Key so a retried batch cannot double-send.
 */

import type { Env } from './index';
import { CI_FROM, RESEND_API, isValidEmail, normalizeEmail, sha256Hex } from './common';
import { codeEmailHtml, codeEmailText, type CodeEmail } from './email';
import { createSingleUseCode, randomCodeSuffix } from './stripe';
import { unsubscribeUrl } from './unsub';

const TTL_SECONDS = 7 * 24 * 60 * 60;
const BATCH = 100;
const DEFAULT_LIMIT = 30;
// The account is on Workers Paid (the read-only /workers/standard check says so), so a
// run may touch 90 addresses (about 5 subrequests each, under the paid limit).
const MAX_LIMIT = 90;

interface Contact { id?: string; email: string; unsubscribed?: boolean; first_name?: string | null }
interface MonthState { code?: string; attempt?: number; minted_at?: number }

export function currentMonth(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).formatToParts(now);
	return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
}

export function monthName(month: string): string {
	const [y, m] = month.split('-').map(Number);
	return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long' }).format(new Date(Date.UTC(y, m - 1, 15)));
}

async function listContacts(env: Env): Promise<Contact[] | null> {
	const all: Contact[] = [];
	let after = '';
	for (let page = 0; page < 20; page++) {
		const query = new URLSearchParams({ limit: '100' });
		if (after) query.set('after', after);
		let response: Response;
		try {
			response = await fetch(`${RESEND_API}/audiences/${env.RESEND_AUDIENCE_ID}/contacts?${query.toString()}`, {
				headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
			});
		} catch (error) {
			console.error('[Monthly list error]', String(error));
			return null;
		}
		if (!response.ok) {
			console.error('[Monthly list failed]', response.status);
			return null;
		}
		const payload = (await response.json().catch(() => null)) as { data?: Contact[]; has_more?: boolean } | null;
		const rows = payload?.data ?? [];
		all.push(...rows);
		if (!payload?.has_more || rows.length === 0) break;
		after = rows[rows.length - 1].id ?? '';
		if (!after) break;
	}
	return all;
}

function email20(code: string, month: string, first: string, unsub: string): CodeEmail {
	return {
		greeting: first ? `Hi ${first},` : 'Hi,',
		intro: `Your personal 20% off code for ${monthName(month)}, good on a class or a jam:`,
		code,
		buttonLabel: 'Buy your ticket, 20% off applied',
		terms: 'The button applies the code for you. It works once and expires in 7 days.',
		details: 'Fridays 7:00 to 9:00 PM at Inner Motion in Hallandale Beach. No partner and no experience needed, just clothes you can roll in.',
		footer: 'You get this about once a month.',
		unsubscribeUrl: unsub,
	};
}

export interface MonthlyResult {
	ok: boolean;
	month: string;
	dry_run: boolean;
	eligible: number;
	minted: number;
	sent: number;
	skipped: number;
	errors: number;
	remaining: number;
	locked?: boolean;
	would_mint?: number;
	would_send?: number;
	error?: string;
}

async function sentHashes(env: Env, month: string): Promise<Set<string>> {
	const prefix = `m20sent:${month}:`;
	const out = new Set<string>();
	let cursor: string | undefined;
	for (let page = 0; page < 20; page++) {
		const res = await env.EMAIL_SUBS.list({ prefix, cursor });
		for (const k of res.keys) out.add(k.name.slice(prefix.length));
		if (res.list_complete !== false || !res.cursor) break;
		cursor = res.cursor;
	}
	return out;
}

export async function monthlyRun(env: Env, origin: string, rawBody: unknown): Promise<MonthlyResult> {
	const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as { dry_run?: unknown; month?: unknown; limit?: unknown; confirm?: unknown };
	// Only an explicit, confirmed, non-dry request sends anything.
	const real = body.confirm === 'send' && body.dry_run === false;
	const dry = !real;
	const month = typeof body.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ? body.month : currentMonth();
	if (!real) return runInner(env, origin, body, month, true);
	const lockKey = `m20lock:${month}`;
	try {
		if (await env.EMAIL_SUBS.get(lockKey)) {
			return { ok: false, month, dry_run: false, eligible: 0, minted: 0, sent: 0, skipped: 0, errors: 0, remaining: 0, locked: true, error: 'A monthly run is already in progress.' };
		}
		await env.EMAIL_SUBS.put(lockKey, String(Date.now()), { expirationTtl: 600 });
	} catch (error) {
		console.error('[Monthly lock failed]', String(error));
		return { ok: false, month, dry_run: false, eligible: 0, minted: 0, sent: 0, skipped: 0, errors: 0, remaining: 0, error: 'Could not take the run lock.' };
	}
	try {
		return await runInner(env, origin, body, month, false);
	} finally {
		try {
			await env.EMAIL_SUBS.delete(lockKey);
		} catch {}
	}
}

async function runInner(env: Env, origin: string, body: { limit?: unknown }, month: string, dry: boolean): Promise<MonthlyResult> {
	const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isInteger(body.limit) ? (body.limit as number) : DEFAULT_LIMIT));
	const out: MonthlyResult = { ok: true, month, dry_run: dry, eligible: 0, minted: 0, sent: 0, skipped: 0, errors: 0, remaining: 0 };
	if (!env.CI_MONTHLY_COUPON_ID || !env.STRIPE_SECRET_KEY || !env.CI_CONFIRM_SECRET || !env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) {
		return { ...out, ok: false, error: 'Monthly run is not configured (CI_MONTHLY_COUPON_ID, STRIPE_SECRET_KEY, CI_CONFIRM_SECRET, RESEND_*).' };
	}
	const contacts = await listContacts(env);
	if (!contacts) return { ...out, ok: false, error: 'Could not list the audience.' };

	const seen = new Set<string>();
	const eligible = contacts.filter((c) => {
		if (!c.email || c.unsubscribed || !isValidEmail(c.email)) return false;
		const key = normalizeEmail(c.email);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	out.eligible = eligible.length;

	const queue: Array<{ contact: Contact; key: string; state: MonthState; hash: string }> = [];
	// One KV list call says who is already sent this month, so the per-address state is
	// read only for the (at most `limit`) addresses this call will actually handle.
	const sent = await sentHashes(env, month);
	let wouldMint = 0;
	let handled = 0;
	for (const contact of eligible) {
		const hash = await sha256Hex(normalizeEmail(contact.email));
		if (sent.has(hash)) {
			out.skipped += 1;
			continue;
		}
		if (handled >= limit) {
			out.remaining += 1;
			continue;
		}
		handled += 1;
		const key = `m20:${month}:${hash}`;
		let state: MonthState = {};
		try {
			state = JSON.parse((await env.EMAIL_SUBS.get(key)) ?? '{}');
		} catch {}
		if (!state.minted_at) {
			if (dry) {
				wouldMint += 1;
				queue.push({ contact, key, state, hash });
				continue;
			}
			const attempt = state.attempt ?? 1;
			const code = state.code ?? `CI20-${randomCodeSuffix()}`;
			try {
				await env.EMAIL_SUBS.put(key, JSON.stringify({ ...state, code, attempt }));
			} catch (error) {
				console.error('[Monthly state write failed]', String(error));
				out.errors += 1;
				continue;
			}
			const result = await createSingleUseCode(env.STRIPE_SECRET_KEY, env.CI_MONTHLY_COUPON_ID, {
				code,
				idempotencyKey: `ci20-${month}-${hash}-${attempt}`,
				nowSeconds: Math.floor(Date.now() / 1000),
				ttlSeconds: TTL_SECONDS,
			});
			if (!result.ok) {
				out.errors += 1;
				if (result.definite) {
					try {
						await env.EMAIL_SUBS.put(key, JSON.stringify({ attempt: attempt + 1 }));
					} catch {}
				}
				continue;
			}
			state = { code: result.code, attempt, minted_at: Date.now() };
			out.minted += 1;
			try {
				await env.EMAIL_SUBS.put(key, JSON.stringify(state));
			} catch {}
		}
		queue.push({ contact, key, state, hash });
	}

	if (dry) return { ...out, would_mint: wouldMint, would_send: queue.length };

	const subject = `Your 20% code for ${monthName(month)}`;
	for (let i = 0; i < queue.length; i += BATCH) {
		const slice = queue.slice(i, i + BATCH);
		const messages = await Promise.all(slice.map(async ({ contact, state }) => {
			const unsub = await unsubscribeUrl(origin, env.CI_CONFIRM_SECRET as string, contact.email);
			const mail = email20(state.code as string, month, (contact.first_name ?? '').trim(), unsub);
			return {
				from: CI_FROM,
				to: [contact.email],
				subject,
				text: codeEmailText(mail),
				html: codeEmailHtml(mail),
				headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
			};
		}));
		let ok = false;
		try {
			// Resend's batch endpoint takes an Idempotency-Key (kept 24h): a retry of the same
			// batch cannot send twice. The key hashes who is in it and which codes they hold.
			const batchHash = (await sha256Hex(slice.map((q) => `${q.hash}:${q.state.code}`).sort().join('|'))).slice(0, 32);
			const response = await fetch(`${RESEND_API}/emails/batch`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.RESEND_API_KEY}`,
					'Content-Type': 'application/json',
					'Idempotency-Key': `m20-${month}-${batchHash}`,
				},
				body: JSON.stringify(messages),
			});
			ok = response.ok;
			if (!ok) console.error('[Monthly batch failed]', response.status);
		} catch (error) {
			console.error('[Monthly batch error]', String(error));
		}
		if (!ok) {
			out.errors += slice.length;
			continue;
		}
		for (const { hash } of slice) {
			try {
				await env.EMAIL_SUBS.put(`m20sent:${month}:${hash}`, String(Date.now()));
			} catch (error) {
				console.error('[Monthly sent mark failed]', String(error));
			}
		}
		out.sent += slice.length;
	}
	return out;
}
