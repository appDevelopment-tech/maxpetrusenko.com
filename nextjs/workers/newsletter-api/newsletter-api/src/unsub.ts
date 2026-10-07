/**
 * Signed unsubscribe link for the monthly email. GET shows a button and changes nothing
 * (mail scanners fetch links); POST, or an RFC 8058 one-click POST from a mail client,
 * sets the Resend contact to unsubscribed. The signature is HMAC-SHA256 over the
 * lowercased address, keyed by CI_CONFIRM_SECRET, so it needs no expiry or storage.
 */

import type { Env } from './index';
import { RESEND_API } from './common';
import { constantTimeEqual } from './otp';

async function hmacHex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
	return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const signUnsubscribe = (secret: string, email: string) => hmacHex(secret, `unsub\n${email.trim().toLowerCase()}`);

export async function unsubscribeUrl(origin: string, secret: string, email: string): Promise<string> {
	const e = email.trim().toLowerCase();
	return `${origin}/api/ci/unsubscribe?${new URLSearchParams({ e, s: await signUnsubscribe(secret, e) }).toString()}`;
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const page = (status: number, body: string) =>
	new Response(
		`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Miami CI</title></head><body style="font-family:Georgia,serif;max-width:32rem;margin:15vh auto;padding:0 1rem">${body}<p><a href="https://miamicontactimprov.com/">miamicontactimprov.com</a></p></body></html>`,
		{ status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
	);

export async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
	if (!env.CI_CONFIRM_SECRET) return page(503, '<p>This link is not available right now.</p>');
	const url = new URL(request.url);
	let e = url.searchParams.get('e') ?? '';
	let s = url.searchParams.get('s') ?? '';
	if (request.method === 'POST' && (!e || !s)) {
		try {
			const form = await request.formData();
			e = String(form.get('e') ?? '');
			s = String(form.get('s') ?? '');
		} catch {}
	}
	const email = e.trim().toLowerCase();
	if (!email || !s || !constantTimeEqual(s, await signUnsubscribe(env.CI_CONFIRM_SECRET, email))) {
		return page(400, '<p>This link is not valid.</p>');
	}
	if (request.method !== 'POST') {
		return page(200, `<p>Stop emails from Miami CI?</p><form method="post" action="/api/ci/unsubscribe"><input type="hidden" name="e" value="${esc(email)}"><input type="hidden" name="s" value="${esc(s)}"><button type="submit" style="font:inherit;padding:.5rem 1rem">Unsubscribe</button></form>`);
	}
	try {
		const response = await fetch(`${RESEND_API}/audiences/${env.RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(email)}`, {
			method: 'PATCH',
			headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ unsubscribed: true }),
		});
		// A contact Resend does not know is already not receiving anything.
		if (!response.ok && response.status !== 404) {
			console.error('[Unsubscribe failed]', response.status);
			return page(502, '<p>That did not go through. Try the link again in a minute.</p>');
		}
	} catch (error) {
		console.error('[Unsubscribe error]', String(error));
		return page(502, '<p>That did not go through. Try the link again in a minute.</p>');
	}
	return page(200, '<p>You are unsubscribed. No more emails.</p>');
}
