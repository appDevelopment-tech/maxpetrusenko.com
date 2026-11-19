/**
 * The ticket confirmation email: class, time, venue, what to bring, the check-in QR
 * (inline PNG via Content-ID), an .ics attachment and a Google Calendar link.
 */

import type { Env } from './index';
import { CI_FROM, RESEND_API } from './common';
import { qrPng, toBase64 } from './qr';
import { EVENTS, type ScheduledEvent } from './schedule';
import { checkinUrl, getTicket, saveTicket, type Ticket } from './tickets';

export const VENUE_NAME = 'Inner Motion Dance Studio';
export const VENUE_ADDRESS = '216 NE 1st Ave, Hallandale Beach, FL 33009';
// Same wording as the "What to bring" section of the site.
export const WHAT_TO_BRING =
	'Clothes you can roll on the floor in, with long sleeves and long legs if you can. No shoes on the dance floor: bare feet or socks. Leave off jewellery, zips and buckles that could catch a partner. Bring water. You do not need a partner or any dance experience.';
const TZ = 'America/New_York';

function esc(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function classLabel(ticket: Pick<Ticket, 'kind'>, event: ScheduledEvent): string {
	if (ticket.kind === 'jam') return 'Friday open jam';
	if (ticket.kind === 'combo') return `${event.title} + open jam`;
	return event.title;
}

function utcStamp(iso: string): string {
	return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function icsEscape(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545: lines are folded at 75 octets; continuation lines start with one space.
function fold(line: string): string {
	const out: string[] = [];
	let rest = line;
	while (rest.length > 74) {
		out.push(rest.slice(0, 74));
		rest = ` ${rest.slice(74)}`;
	}
	out.push(rest);
	return out.join('\r\n');
}

// DTSTAMP is the ticket's created_at, not the clock: one ticket always yields byte-identical
// bytes, which the Resend Idempotency-Key relies on.
export function buildIcs(ticket: Ticket, event: ScheduledEvent): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Miami Contact Improv//Tickets//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${ticket.id}@miamicontactimprov.com`,
		`DTSTAMP:${utcStamp(new Date(ticket.created_at).toISOString())}`,
		`DTSTART:${utcStamp(event.start)}`,
		`DTEND:${utcStamp(event.end)}`,
		`SUMMARY:${icsEscape(classLabel(ticket, event))}`,
		`LOCATION:${icsEscape(`${VENUE_NAME}, ${VENUE_ADDRESS}`)}`,
		`DESCRIPTION:${icsEscape(`Show the QR code from your confirmation email at the door. What to bring: ${WHAT_TO_BRING}`)}`,
		'END:VEVENT',
		'END:VCALENDAR',
	];
	return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function googleCalendarUrl(ticket: Ticket, event: ScheduledEvent): string {
	const q = new URLSearchParams({
		action: 'TEMPLATE',
		text: classLabel(ticket, event),
		dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
		location: `${VENUE_NAME}, ${VENUE_ADDRESS}`,
		details: 'Show the QR code from your confirmation email at the door.',
	});
	return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function whenText(event: ScheduledEvent): string {
	const day = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(event.start));
	const t = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
	return `${day}, ${t(event.start)} to ${t(event.end)} (Miami time)`;
}

export interface TicketEmailPayload {
	from: string;
	to: string[];
	subject: string;
	html: string;
	text: string;
	attachments: Array<{ filename: string; content: string; content_type: string; content_id?: string }>;
}

export async function buildTicketEmail(env: Env, ticket: Ticket, event: ScheduledEvent): Promise<TicketEmailPayload> {
	const label = classLabel(ticket, event);
	const when = whenText(event);
	const venue = `${VENUE_NAME}, ${VENUE_ADDRESS}`;
	const gcal = googleCalendarUrl(ticket, event);
	const first = ticket.name.split(' ')[0];
	const greeting = first ? `Hi ${first}, you're in.` : "You're in.";
	const png = await qrPng(checkinUrl(env, ticket.id));
	const ics = buildIcs(ticket, event);

	const text = `${greeting}

${label}
${when}
${venue}

Show the QR code in this email at the door. If it does not load, your name is on the list.

What to bring: ${WHAT_TO_BRING}

Add to calendar: ${gcal}
The attached .ics works with Apple Calendar and Outlook.

Questions? Reply to this email.

Max`;

	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(label)}</title></head>
<body style="margin:0;padding:0;background:#F3EDE1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EDE1"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px">
<tr><td style="padding:30px 28px 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#171512;font-size:16px;line-height:1.5">
<p style="margin:0 0 6px;font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#8A7B5E">Miami CI</p>
<p style="margin:0 0 14px">${esc(greeting)}</p>
<p style="margin:0;font-weight:bold">${esc(label)}</p>
<p style="margin:0">${esc(when)}</p>
<p style="margin:0 0 6px">${esc(venue)}</p>
</td></tr>
<tr><td align="center" style="padding:10px 28px">
<img src="cid:ticket-qr" width="220" height="220" alt="Check-in QR code" style="display:block;border:0">
<p style="margin:8px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#4A463D">Show this at the door.</p>
</td></tr>
<tr><td align="center" style="padding:6px 28px 8px">
<a href="${esc(gcal)}" style="display:inline-block;background:#171512;color:#F3EDE1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:15px 26px;border-radius:999px">Add to Google Calendar</a>
</td></tr>
<tr><td style="padding:16px 28px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#4A463D;font-size:14px;line-height:1.5">
<p style="margin:0 0 12px"><strong>What to bring.</strong> ${esc(WHAT_TO_BRING)}</p>
<p style="margin:0 0 12px">The attached .ics works with Apple Calendar and Outlook. Questions? Reply to this email.</p>
<p style="margin:0">Max</p>
</td></tr>
</table></td></tr></table></body></html>`;

	return {
		from: CI_FROM,
		to: [ticket.email],
		subject: `Your ticket: ${label}, ${event.date}`,
		html,
		text,
		attachments: [
			{ filename: 'ticket-qr.png', content: toBase64(png), content_type: 'image/png', content_id: 'ticket-qr' },
			{ filename: 'miami-ci-class.ics', content: toBase64(new TextEncoder().encode(ics)), content_type: 'text/calendar; method=PUBLISH' },
		],
	};
}

/**
 * Writes email fields onto the freshest copy of the ticket. KV has no compare-and-set, so
 * re-reading right before the put keeps a concurrent writer's fields (checked_in_at, an
 * earlier email_sent_at) from being clobbered by our stale in-memory copy.
 */
async function patchEmailFields(env: Env, ticket: Ticket, patch: Partial<Pick<Ticket, 'email_sent_at' | 'email_id' | 'email_error'>>): Promise<void> {
	const fresh = (await getTicket(env, ticket.id)) ?? ticket;
	const merged: Ticket = { ...fresh, ...patch };
	if (fresh.email_sent_at) {
		// Already recorded by another run: keep it, never reset or move it.
		merged.email_sent_at = fresh.email_sent_at;
		merged.email_id = fresh.email_id ?? merged.email_id;
	}
	await saveTicket(env, merged);
}

/**
 * Sends the confirmation once per ticket. Safe to call again on a Stripe retry: it
 * returns early when the ticket already records a send, and the Resend idempotency key
 * covers two deliveries racing each other.
 */
export async function sendTicketEmail(env: Env, ticket: Ticket): Promise<'sent' | 'already_sent' | 'skipped' | 'failed'> {
	const current = (await getTicket(env, ticket.id)) ?? ticket;
	if (current.email_sent_at) return 'already_sent';
	ticket = current;
	const event = EVENTS.find((e) => e.date === ticket.event_date);
	if (!ticket.email || !event) {
		console.error('[Ticket email skipped]', ticket.id, ticket.email ? 'unknown event date' : 'no email on session');
		return 'skipped';
	}
	if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

	const payload = await buildTicketEmail(env, ticket, event);
	const response = await fetch(`${RESEND_API}/emails`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
			'Idempotency-Key': `ci-ticket-email-${ticket.id}`,
		},
		body: JSON.stringify(payload),
	});
	const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
	if (response.status === 409) {
		// Idempotency conflict: Resend already holds a send for this key (same payload, since
		// it is deterministic per ticket). Treat as delivered.
		await patchEmailFields(env, ticket, { email_sent_at: new Date().toISOString(), email_error: null });
		return 'already_sent';
	}
	if (!response.ok) {
		// A 4xx other than rate limiting or a request timeout is the recipient or the payload
		// being wrong: retrying for days would not fix it. Record it on the ticket (the host
		// can see who never got a mail) and let the webhook answer 200. 5xx, 429 and network
		// errors throw so Stripe retries.
		if (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status)) {
			console.error('[Ticket email rejected]', ticket.id, response.status, body?.message ?? '');
			await patchEmailFields(env, ticket, { email_error: `${response.status}: ${body?.message ?? 'rejected'}` });
			return 'failed';
		}
		throw new Error(`Resend ${response.status}: ${body?.message ?? 'send failed'}`);
	}

	await patchEmailFields(env, ticket, { email_sent_at: new Date().toISOString(), email_id: body?.id ?? null, email_error: null });
	return 'sent';
}
