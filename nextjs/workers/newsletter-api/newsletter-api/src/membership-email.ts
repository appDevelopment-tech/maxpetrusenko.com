/**
 * The membership confirmation email: plan, what it covers, the Black Friday friend
 * passes when the member earned them, and the link to manage or cancel (Stripe Customer
 * Portal, opened from the site's /membership/manage page).
 */

import type { Env } from './index';
import { CI_FROM, RESEND_API } from './common';
import { BF_FRIEND_PASSES } from './bf';
import { VENUE_ADDRESS, VENUE_NAME } from './ticket-email';
import { getMember, manageUrl, type MemberProfile } from './membership';

function esc(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface MembershipEmail { subject: string; html: string; text: string }

export function buildMembershipEmail(member: MemberProfile): MembershipEmail {
	const first = member.name.split(' ')[0];
	const greeting = first ? `Hi ${first}, welcome in.` : 'Welcome in.';
	const monthly = member.plan === 'monthly';
	const planLine = monthly
		? 'Monthly membership: 4 class credits each billing month. Credits you do not use roll over, up to 8 banked.'
		: 'Yearly membership: one class every week.';
	const covers = 'Memberships cover the Friday class, not jams or workshops.';
	const where = `Fridays 7:00 to 9:00 PM at ${VENUE_NAME}, ${VENUE_ADDRESS}.`;
	const bf = member.bf
		? `Black Friday bonus: your membership includes ${BF_FRIEND_PASSES} bring-a-friend passes, one a month for your first three months. Reply to this email the week you want to use one.`
		: '';
	const manage = manageUrl(member.id);
	const text = [greeting, planLine, covers, where, bf, `Manage or cancel your membership, update your card, see invoices: ${manage}`, 'Questions? Reply to this email.', 'Max']
		.filter(Boolean).join('\n\n');
	const p = (s: string) => `<p style="margin:0 0 14px">${esc(s)}</p>`;
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Miami CI membership</title></head>
<body style="margin:0;padding:0;background:#F3EDE1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EDE1"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px">
<tr><td style="padding:30px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#171512;font-size:16px;line-height:1.5">
<p style="margin:0 0 6px;font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#8A7B5E">Miami CI</p>
${[greeting, planLine, covers, where, bf].filter(Boolean).map(p).join('\n')}
<p style="margin:22px 0"><a href="${esc(manage)}" style="display:inline-block;background:#171512;color:#F3EDE1;font-weight:bold;text-decoration:none;padding:15px 26px;border-radius:999px">Manage your membership</a></p>
<p style="margin:0 0 14px;font-size:14px;color:#4A463D">Cancel, update your card or see invoices there. Questions? Reply to this email.</p>
<p style="margin:0">Max</p>
</td></tr></table></td></tr></table></body></html>`;
	return { subject: member.bf ? 'Your Miami CI membership (and your friend passes)' : 'Your Miami CI membership', html, text };
}

/**
 * Sends the welcome once per member. Same contract as sendTicketEmail: safe to repeat on
 * a Stripe retry (the record keeps email_sent_at, Resend has an Idempotency-Key), a 4xx
 * that retrying cannot fix is recorded and acknowledged, 5xx/429/network throws.
 */
export async function sendMembershipEmail(env: Env, member: MemberProfile): Promise<'sent' | 'already_sent' | 'skipped' | 'failed'> {
	const current = (await getMember(env, member.id)) ?? member;
	if (current.email_sent_at) return 'already_sent';
	if (!current.email) {
		console.error('[Membership email skipped]', current.id, 'no email on session');
		return 'skipped';
	}
	if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
	const mail = buildMembershipEmail(current);
	const response = await fetch(`${RESEND_API}/emails`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ci-member-email-${current.id}` },
		body: JSON.stringify({ from: CI_FROM, to: [current.email], subject: mail.subject, html: mail.html, text: mail.text }),
	});
	const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
	const patch = async (fields: Partial<Pick<MemberProfile, 'email_sent_at' | 'email_id' | 'email_error'>>) => {
		const fresh = (await getMember(env, current.id)) ?? current;
		await env.TICKETS!.put(`mem:${current.id}`, JSON.stringify({ ...fresh, ...fields }));
	};
	if (response.status === 409) {
		await patch({ email_sent_at: new Date().toISOString(), email_error: null });
		return 'already_sent';
	}
	if (!response.ok) {
		if (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status)) {
			console.error('[Membership email rejected]', current.id, response.status, body?.message ?? '');
			await patch({ email_error: `${response.status}: ${body?.message ?? 'rejected'}` });
			return 'failed';
		}
		throw new Error(`Resend ${response.status}: ${body?.message ?? 'send failed'}`);
	}
	await patch({ email_sent_at: new Date().toISOString(), email_id: body?.id ?? null, email_error: null });
	return 'sent';
}
