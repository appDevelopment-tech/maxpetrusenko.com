/**
 * 24-hour class reminders for ticket holders and active members.
 *
 * POST /api/ci/reminder-run (admin Bearer), body { dry_run?: boolean, date?: 'YYYY-MM-DD' }.
 * `dry_run` defaults to true: counts and a preview, nothing sent. The class is the next
 * event that starts 12 to 36 hours from now, unless `date` names one. The Thursday 7:00 PM
 * Eastern job on maxiclaw (not a Cloudflare cron) calls this with dry_run:false.
 *
 * One email per person per class: people are keyed on normalizeEmail, a ticket holder gets
 * their ticket's check-in link, a member without a ticket gets the member check-in link.
 * Idempotent through the KV marker `rem:<date>:<sha256(email)>` (and the Resend
 * Idempotency-Key), so a second run sends nothing. Refunded tickets and non-active members
 * are skipped. These are transactional mails: no unsubscribe footer, support address instead.
 * Real sends are refused outside 8:00 AM to 10:00 PM Eastern.
 */

import type { Env } from './index';
import { CI_FROM, RESEND_API, isValidEmail, normalizeEmail, sha256Hex } from './common';
import { CHECKIN_PAGE, SUPPORT_EMAIL } from './checkin';
import { EVENTS, type ScheduledEvent } from './schedule';
import { getMember } from './membership';
import { checkinUrl, getTicket, listTicketIdsForDate } from './tickets';
import { VENUE_ADDRESS, VENUE_NAME } from './ticket-email';

const TZ = 'America/New_York';
const MIN_LEAD_MS = 12 * 3600 * 1000;
const MAX_LEAD_MS = 36 * 3600 * 1000;
export const MAX_REMINDERS_PER_RUN = 150;
const MARKER_TTL_SECONDS = 60 * 24 * 3600;

export function easternHour(now: Date): number {
	return Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(now)) % 24;
}

export function inQuietHours(now: Date): boolean {
	const h = easternHour(now);
	return h < 8 || h >= 22;
}

export function reminderEvent(now: Date, date?: unknown): ScheduledEvent | null {
	if (typeof date === 'string' && date) return EVENTS.find((e) => e.date === date) ?? null;
	return EVENTS.find((e) => {
		const lead = new Date(e.start).getTime() - now.getTime();
		return lead >= MIN_LEAD_MS && lead <= MAX_LEAD_MS;
	}) ?? null;
}

function esc(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface ReminderEmail { subject: string; text: string; html: string }

export function reminderEmail(event: ScheduledEvent, who: { name: string; link: string; kind: 'ticket' | 'member' }): ReminderEmail {
	const day = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(event.start));
	const t = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
	const when = `${day}, ${t(event.start)} to ${t(event.end)}`;
	const venue = `${VENUE_NAME}, ${VENUE_ADDRESS}`;
	const first = who.name.split(' ')[0];
	const greeting = first ? `Hi ${first},` : 'Hi,';
	const intro = `${event.title} is tomorrow.`;
	const how = who.kind === 'ticket'
		? 'Open your ticket on your phone when you arrive. Scanning the QR at the studio checks you in; check-in opens at 6:30 PM.'
		: 'Open the check-in link on the phone you bring. Scanning the QR at the studio checks you in; check-in opens at 6:30 PM.';
	const label = who.kind === 'ticket' ? 'Open my ticket' : 'Open my check-in';
	const text = `${greeting}\n\n${intro}\n${when}\n${venue}\n\n${how}\n${who.link}\n\nProblems or a refund: ${SUPPORT_EMAIL}\n\nMax`;
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(event.title)} tomorrow</title></head>
<body style="margin:0;padding:0;background:#F3EDE1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EDE1"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px">
<tr><td style="padding:30px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#171512;font-size:16px;line-height:1.5">
<p style="margin:0 0 6px;font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#8A7B5E">Miami CI</p>
<p style="margin:0 0 14px">${esc(greeting)} ${esc(intro)}</p>
<p style="margin:0;font-weight:bold">${esc(when)}</p>
<p style="margin:0 0 14px">${esc(venue)}</p>
<p style="margin:0 0 14px">${esc(how)}</p>
<p style="margin:22px 0"><a href="${esc(who.link)}" style="display:inline-block;background:#171512;color:#F3EDE1;font-weight:bold;text-decoration:none;padding:15px 26px;border-radius:999px">${label}</a></p>
<p style="margin:0 0 14px;font-size:14px;color:#4A463D">Problems or a refund: <a href="mailto:${SUPPORT_EMAIL}" style="color:#4A463D">${SUPPORT_EMAIL}</a></p>
<p style="margin:0">Max</p>
</td></tr></table></td></tr></table></body></html>`;
	return { subject: `Tomorrow: ${event.title}, 7:00 PM`, text, html };
}

interface Recipient { key: string; email: string; name: string; link: string; kind: 'ticket' | 'member' }

async function collectRecipients(env: Env, event: ScheduledEvent): Promise<{ recipients: Recipient[]; tickets: number; members: number; skipped_refunded: number }> {
	const byPerson = new Map<string, Recipient>();
	let tickets = 0;
	let members = 0;
	let skippedRefunded = 0;
	for (const id of await listTicketIdsForDate(env, event.date)) {
		const t = await getTicket(env, id);
		if (!t) continue;
		if (t.refunded_at) { skippedRefunded += 1; continue; }
		if (!t.email || !isValidEmail(t.email)) continue;
		const key = normalizeEmail(t.email);
		if (byPerson.has(key)) continue;
		tickets += 1;
		byPerson.set(key, { key, email: t.email, name: t.name, link: checkinUrl(env, t.id), kind: 'ticket' });
	}
	let cursor: string | undefined;
	do {
		const page = await env.TICKETS!.list({ prefix: 'mem:', cursor } as any);
		for (const k of page.keys) {
			const m = await getMember(env, k.name.slice('mem:'.length));
			if (!m || m.status !== 'active' || !m.email || !isValidEmail(m.email)) continue;
			const key = normalizeEmail(m.email);
			if (byPerson.has(key)) continue;
			members += 1;
			byPerson.set(key, { key, email: m.email, name: m.name, link: `${CHECKIN_PAGE}?m=${m.id}`, kind: 'member' });
		}
		cursor = page.list_complete === false ? page.cursor : undefined;
	} while (cursor);
	return { recipients: [...byPerson.values()], tickets, members, skipped_refunded: skippedRefunded };
}

export interface ReminderResult {
	ok: boolean;
	dry_run: boolean;
	date: string | null;
	ticket_holders: number;
	members: number;
	skipped_refunded: number;
	already_sent: number;
	would_send?: number;
	sent?: number;
	failed?: number;
	truncated?: boolean;
	error?: string;
	preview?: { subject: string; text: string };
}

export async function reminderRun(env: Env, rawBody: unknown, now = new Date()): Promise<ReminderResult> {
	const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as { dry_run?: unknown; date?: unknown };
	const real = body.dry_run === false;
	const out: ReminderResult = { ok: true, dry_run: !real, date: null, ticket_holders: 0, members: 0, skipped_refunded: 0, already_sent: 0 };
	if (!env.TICKETS || !env.RESEND_API_KEY) return { ...out, ok: false, error: 'Reminders are not configured (TICKETS, RESEND_API_KEY).' };
	const event = reminderEvent(now, body.date);
	if (!event) return { ...out, ok: false, error: typeof body.date === 'string' && body.date ? 'Unknown class date.' : 'No class starts 12 to 36 hours from now.' };
	out.date = event.date;
	if (real && inQuietHours(now)) return { ...out, ok: false, error: 'Quiet hours: reminders send between 8:00 AM and 10:00 PM Eastern.' };

	const { recipients, tickets, members, skipped_refunded } = await collectRecipients(env, event);
	out.ticket_holders = tickets;
	out.members = members;
	out.skipped_refunded = skipped_refunded;
	const todo: Array<Recipient & { hash: string }> = [];
	for (const r of recipients) {
		const hash = await sha256Hex(r.key);
		if (await env.TICKETS.get(`rem:${event.date}:${hash}`)) out.already_sent += 1;
		else todo.push({ ...r, hash });
	}
	const sample = todo[0] ?? recipients[0];
	if (sample) {
		const p = reminderEmail(event, sample);
		out.preview = { subject: p.subject, text: p.text };
	}
	if (!real) return { ...out, would_send: todo.length };

	out.truncated = todo.length > MAX_REMINDERS_PER_RUN;
	out.sent = 0;
	out.failed = 0;
	for (const r of todo.slice(0, MAX_REMINDERS_PER_RUN)) {
		const mail = reminderEmail(event, r);
		try {
			const response = await fetch(`${RESEND_API}/emails`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ci-reminder-${event.date}-${r.hash}` },
				body: JSON.stringify({ from: CI_FROM, to: [r.email], reply_to: SUPPORT_EMAIL, subject: mail.subject, text: mail.text, html: mail.html }),
			});
			// 409: Resend already holds this key, so the mail went out on an earlier run.
			if (response.ok || response.status === 409) {
				await env.TICKETS.put(`rem:${event.date}:${r.hash}`, now.toISOString(), { expirationTtl: MARKER_TTL_SECONDS });
				out.sent += 1;
			} else {
				console.error('[Reminder failed]', r.hash.slice(0, 8), response.status);
				out.failed += 1;
			}
		} catch (error) {
			console.error('[Reminder error]', String(error));
			out.failed += 1;
		}
	}
	return out;
}
