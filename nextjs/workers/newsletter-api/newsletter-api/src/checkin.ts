/**
 * Studio self check-in. One printed QR at the studio points at https://miamicontactimprov.com/checkin.
 *
 *   POST /api/checkin/member   {member_id}  a member's phone (token kept on the device) checks itself in
 *   POST /api/checkin/link     {email}      emails a member the link that stores that token (one transactional email)
 *   GET  /api/checkin/ticket?id=            is this single-class ticket valid / used
 *   POST /api/checkin/ticket   {ticket_id}  marks a single-class ticket used
 * The host-side admin route (POST /api/membership/checkin) is unchanged.
 *
 * Check-in is only possible inside the class window of an EVENTS date: the evening of the
 * class from 30 minutes before the 7:00 PM start (6:30 PM) to the 9:00 PM end, Eastern.
 * A member check-in spends a credit (monthly) or the weekly slot (yearly) through burnCredit,
 * idempotent per class date. Refunds and problems are never automated: every denial points at
 * the support address.
 */

import type { Env } from './index';
import { CI_FROM, RESEND_API, isValidEmail, normalizeEmail, sha256Hex } from './common';
import { classWindow } from './schedule';
import { burnCredit, creditsRemaining, getMember, isMemberId, shortId } from './membership';
import { getTicket, isTicketId, saveTicket } from './tickets';

// The inbox Hermes already watches (cron job brand-inbox-forward): the site's contact address.
export const SUPPORT_EMAIL = 'hello@miamicontactimprov.com';
export const CHECKIN_PAGE = 'https://miamicontactimprov.com/checkin';
const LINK_COOLDOWN_SECONDS = 120;

function json(body: unknown, status: number, cors: Record<string, string>): Response {
	return Response.json(body, { status, headers: cors });
}

function firstName(name: string): string {
	return name.split(' ')[0] ?? '';
}

function denied(error: string, status: number, cors: Record<string, string>, extra: Record<string, unknown> = {}): Response {
	return json({ ok: false, error, support_email: SUPPORT_EMAIL, ...extra }, status, cors);
}

export async function handleMemberCheckin(request: Request, env: Env, cors: Record<string, string>, now = new Date()): Promise<Response> {
	let body: { member_id?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
	}
	const id = typeof body.member_id === 'string' ? body.member_id : '';
	if (!isMemberId(id)) return denied('unknown_member', 400, cors);
	if (!env.TICKETS || !env.TICKET_SECRET) return json({ ok: false, error: 'Check-in not configured' }, 500, cors);

	const member = await getMember(env, id);
	if (!member) return denied('unknown_member', 404, cors);
	const w = classWindow(now);
	if (!w || !w.open) return denied('outside_window', 409, cors, { opens_at: w?.opensAt.toISOString() ?? null });

	const result = await burnCredit(env, id, w.event.date, now);
	if (!result.ok) {
		console.error('[Member check-in denied]', await shortId(id), result.error);
		return denied(result.error, 409, cors);
	}
	const plan = member.plan;
	return json(
		{
			ok: true,
			already: result.already === true,
			name: firstName(member.name),
			plan,
			event_date: w.event.date,
			credits_remaining: plan === 'monthly' ? await creditsRemaining(env, id) : null,
		},
		200,
		cors,
	);
}

/**
 * Emails a member the link that puts their device token on a new phone. One email, one
 * address, never a list. The answer is the same whether or not the address belongs to a
 * member, so the endpoint cannot be used to find out who is one; a per-address cooldown
 * stops it being used to flood an inbox.
 */
export async function handleCheckinLink(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
	let body: { email?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
	}
	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!isValidEmail(email)) return json({ ok: false, error: 'Invalid email' }, 400, cors);
	if (!env.TICKETS || !env.TICKET_SECRET || !env.RESEND_API_KEY) return json({ ok: false, error: 'Check-in not configured' }, 500, cors);

	const hash = await sha256Hex(normalizeEmail(email));
	const reply = json({ ok: true }, 200, cors);
	if (await env.TICKETS.get(`memlink:${hash}`)) return reply;
	const id = await env.TICKETS.get(`mememail:${hash}`);
	const member = id ? await getMember(env, id) : null;
	if (!member || member.status !== 'active') return reply;
	await env.TICKETS.put(`memlink:${hash}`, '1', { expirationTtl: LINK_COOLDOWN_SECONDS });

	const link = `${CHECKIN_PAGE}?m=${member.id}`;
	const text = `Hi${firstName(member.name) ? ` ${firstName(member.name)}` : ''},\n\nOpen this link on the phone you bring to class. After that, scanning the QR at the studio checks you in.\n\n${link}\n\nIf you did not ask for this, ignore it; nothing happens unless the link is opened.\nProblems or a refund: ${SUPPORT_EMAIL}\n\nMax`;
	const html = `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#F3EDE1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#171512;font-size:16px;line-height:1.5">
<p>Open this link on the phone you bring to class. After that, scanning the QR at the studio checks you in.</p>
<p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#171512;color:#F3EDE1;font-weight:bold;text-decoration:none;padding:15px 26px;border-radius:999px">Set up check-in on this phone</a></p>
<p style="font-size:14px;color:#4A463D">If you did not ask for this, ignore it; nothing happens unless the link is opened. Problems or a refund: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
<p>Max</p></body></html>`;
	try {
		const response = await fetch(`${RESEND_API}/emails`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ from: CI_FROM, to: [member.email], subject: 'Your Miami CI check-in link', text, html }),
		});
		if (!response.ok) console.error('[Check-in link email failed]', await shortId(member.id), response.status);
	} catch (error) {
		console.error('[Check-in link email error]', String(error));
	}
	return reply;
}

export async function handleTicketLookup(request: Request, env: Env, cors: Record<string, string>, now = new Date()): Promise<Response> {
	const id = new URL(request.url).searchParams.get('id') ?? '';
	if (!isTicketId(id)) return denied('unknown_ticket', 400, cors);
	if (!env.TICKETS) return json({ ok: false, error: 'Check-in not configured' }, 500, cors);
	const t = await getTicket(env, id);
	if (!t) return denied('unknown_ticket', 404, cors);
	const w = classWindow(now);
	return json(
		{
			ok: true,
			valid: true,
			used: !!t.checked_in_at,
			checked_in_at: t.checked_in_at,
			name: firstName(t.name),
			kind: t.kind,
			event_date: t.event_date,
			is_tonight: !!w && w.event.date === t.event_date,
			window_open: !!w && w.open,
		},
		200,
		cors,
	);
}

export async function handleTicketCheckin(request: Request, env: Env, cors: Record<string, string>, now = new Date()): Promise<Response> {
	let body: { ticket_id?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400, cors);
	}
	const id = typeof body.ticket_id === 'string' ? body.ticket_id : '';
	if (!isTicketId(id)) return denied('unknown_ticket', 400, cors);
	if (!env.TICKETS) return json({ ok: false, error: 'Check-in not configured' }, 500, cors);
	const ticket = await getTicket(env, id);
	if (!ticket) return denied('unknown_ticket', 404, cors);
	const base = { name: firstName(ticket.name), kind: ticket.kind, event_date: ticket.event_date };
	if (ticket.checked_in_at) return json({ ok: true, already: true, checked_in_at: ticket.checked_in_at, ...base }, 200, cors);

	const w = classWindow(now);
	if (!w || !w.open) return denied('outside_window', 409, cors, { ...base, opens_at: w?.opensAt.toISOString() ?? null });
	if (w.event.date !== ticket.event_date) return denied('wrong_date', 409, cors, base);

	// Re-read right before writing: the confirmation email patches its own fields on this same
	// record, and a scan landing on top of it must not erase them.
	const fresh = (await getTicket(env, id)) ?? ticket;
	if (fresh.checked_in_at) return json({ ok: true, already: true, checked_in_at: fresh.checked_in_at, ...base }, 200, cors);
	const checkedInAt = now.toISOString();
	await saveTicket(env, { ...fresh, checked_in_at: checkedInAt });
	return json({ ok: true, already: false, checked_in_at: checkedInAt, ...base }, 200, cors);
}

