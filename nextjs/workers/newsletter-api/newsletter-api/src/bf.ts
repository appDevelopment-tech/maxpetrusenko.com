/**
 * Black Friday 2026: the window, the offer, and the email draft.
 *
 * Offer (Max, 2026-11-21): a membership bought between Nov 27 00:00 and Dec 1 23:59
 * America/New_York earns one free bring-a-friend pass per month for the first three
 * months. No price change.
 *
 * POST /api/ci/bf-run (admin Bearer) prepares the BF email for past attendees. It can
 * never send: there is no send or batch call anywhere in this file. A dry run (the
 * default) returns counts and a preview. `confirm: "draft"` with `dry_run: false` records
 * the attendee queue and creates ONE Resend broadcast in draft state; Max approves and
 * sends it from the Resend dashboard.
 */

import type { Env } from './index';
import { CI_FROM, RESEND_API, isValidEmail, normalizeEmail, sha256Hex } from './common';
import { listContacts } from './monthly';
import { listTicketsForBf } from './tickets';

export const BF_CAMPAIGN = 'bf-2026';
// Both instants carry the EST offset: DST ended Nov 1, 2026.
export const BF_START = '2026-11-27T00:00:00-05:00';
export const BF_END = '2026-12-01T23:59:59.999-05:00';
export const BF_FRIEND_PASSES = 3;

export function inBfWindow(at: Date): boolean {
	const t = at.getTime();
	return t >= new Date(BF_START).getTime() && t <= new Date(BF_END).getTime();
}

/** The three monthly passes, the first usable now, the next two a month apart. */
export function friendPassesFor(purchasedAt: Date): Array<{ n: number; available_from: string; redeemed_at: string | null; redeemed_by: string | null }> {
	const passes = [];
	for (let i = 0; i < BF_FRIEND_PASSES; i++) {
		const d = new Date(purchasedAt.getTime());
		d.setUTCMonth(d.getUTCMonth() + i);
		passes.push({ n: i + 1, available_from: d.toISOString(), redeemed_at: null, redeemed_by: null });
	}
	return passes;
}

export const BF_PAGE_URL =
	`https://miamicontactimprov.com/membership?utm_source=email&utm_medium=resend&utm_campaign=${BF_CAMPAIGN}&utm_content=past-attendees`;

export interface BfEmail { subject: string; html: string; text: string }

export function bfEmail(): BfEmail {
	const subject = 'Black Friday at Miami CI: bring a friend free';
	const lines = [
		'Hi,',
		'From Friday, November 27 through Tuesday, December 1, every membership comes with a free bring-a-friend pass: one a month for your first three months.',
		'Monthly is $40 for 4 classes a month, and what you do not use rolls over (up to 8 banked). Yearly is $260 for a class every week. The prices have not changed.',
		'Classes run Fridays 7:00 to 9:00 PM at Inner Motion Dance Studio in Hallandale Beach.',
	];
	const text = `${lines.join('\n\n')}\n\nJoin: ${BF_PAGE_URL}\n\nMax\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`;
	const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`;
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F3EDE1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EDE1"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px">
<tr><td style="padding:30px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#171512;font-size:16px;line-height:1.5">
<p style="margin:0 0 6px;font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#8A7B5E">Miami CI</p>
${lines.map(p).join('\n')}
<p style="margin:22px 0"><a href="${BF_PAGE_URL}" style="display:inline-block;background:#171512;color:#F3EDE1;font-weight:bold;text-decoration:none;padding:15px 26px;border-radius:999px">See the memberships</a></p>
<p style="margin:0 0 18px">Max</p>
<p style="margin:0;font-size:13px;color:#4A463D"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#4A463D">Unsubscribe</a></p>
</td></tr></table></td></tr></table></body></html>`;
	return { subject, html, text };
}

function easternDate(now: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export interface BfRunResult {
	ok: boolean;
	dry_run: boolean;
	campaign: string;
	tickets_scanned: number;
	attendees: number;
	unsubscribed_excluded: number;
	already_queued: number;
	would_queue?: number;
	queued?: number;
	truncated: boolean;
	// Resend broadcasts go to a whole audience here, not to the attendee list. Stated in every
	// response so nobody approves the draft believing it is attendees-only.
	audience: 'all';
	warning: string;
	broadcast?: { id: string | null; created: boolean };
	preview: { subject: string; text: string };
	error?: string;
}

export async function bfRun(env: Env, rawBody: unknown, now = new Date()): Promise<BfRunResult> {
	const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as { dry_run?: unknown; confirm?: unknown };
	const real = body.confirm === 'draft' && body.dry_run === false;
	const mail = bfEmail();
	const out: BfRunResult = {
		ok: true, dry_run: !real, campaign: BF_CAMPAIGN, tickets_scanned: 0, attendees: 0, truncated: false, audience: 'all',
		warning: 'The Resend draft targets the whole audience, not only these attendees. Pick a segment of them in the Resend dashboard before sending, or accept the full audience.', unsubscribed_excluded: 0, already_queued: 0,
		preview: { subject: mail.subject, text: mail.text },
	};
	if (!env.TICKETS || !env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) {
		return { ...out, ok: false, error: 'BF run is not configured (TICKETS, RESEND_API_KEY, RESEND_AUDIENCE_ID).' };
	}
	const contacts = await listContacts(env);
	if (!contacts) return { ...out, ok: false, error: 'Could not list the audience.' };
	const unsubscribed = new Set(contacts.filter((c) => c.unsubscribed && c.email).map((c) => normalizeEmail(c.email)));

	const today = easternDate(now);
	const { tickets, truncated } = await listTicketsForBf(env);
	out.tickets_scanned = tickets.length;
	out.truncated = truncated;
	const seen = new Set<string>();
	const attendees: Array<{ hash: string }> = [];
	for (const t of tickets) {
		if (!t.email || !isValidEmail(t.email) || t.event_date >= today) continue;
		const key = normalizeEmail(t.email);
		if (seen.has(key)) continue;
		seen.add(key);
		if (unsubscribed.has(key)) {
			out.unsubscribed_excluded += 1;
			continue;
		}
		attendees.push({ hash: await sha256Hex(key) });
	}
	out.attendees = attendees.length;

	const fresh: string[] = [];
	for (const a of attendees) {
		if (await env.TICKETS.get(`bfq:${a.hash}`)) out.already_queued += 1;
		else fresh.push(a.hash);
	}
	if (!real) return { ...out, would_queue: fresh.length };

	// One broadcast in draft state. Not sending is the absence of a send call, and the
	// body carries no `send` or `scheduled_at` field.
	const draftKey = `bfdraft:${BF_CAMPAIGN}`;
	const existing = await env.TICKETS.get(draftKey);
	if (existing) {
		out.broadcast = { id: existing, created: false };
		return queueDrafted(env, out, fresh, now);
	}
	try {
		const response = await fetch(`${RESEND_API}/broadcasts`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ci-${BF_CAMPAIGN}-draft` },
			body: JSON.stringify({ audience_id: env.RESEND_AUDIENCE_ID, from: CI_FROM, subject: mail.subject, html: mail.html, text: mail.text, name: 'Black Friday 2026 (draft)' }),
		});
		const payload = (await response.json().catch(() => null)) as { id?: string } | null;
		if (!response.ok || !payload?.id) {
			console.error('[BF draft failed]', response.status);
			return { ...out, ok: false, error: 'Resend refused the broadcast draft.', broadcast: { id: null, created: false } };
		}
		await env.TICKETS.put(draftKey, payload.id);
		out.broadcast = { id: payload.id, created: true };
	} catch (error) {
		console.error('[BF draft error]', String(error));
		return { ...out, ok: false, error: 'Could not reach Resend.', broadcast: { id: null, created: false } };
	}
	return queueDrafted(env, out, fresh, now);
}

// The queue records what a draft covers, so it is written only once a broadcast draft exists:
// a refused or unreachable Resend leaves no entry claiming "drafted".
async function queueDrafted(env: Env, out: BfRunResult, fresh: string[], now: Date): Promise<BfRunResult> {
	for (const hash of fresh) {
		await env.TICKETS!.put(`bfq:${hash}`, JSON.stringify({ status: 'drafted', segment: 'attended', campaign: BF_CAMPAIGN, created_at: now.toISOString() }));
	}
	out.queued = fresh.length;
	return out;
}
