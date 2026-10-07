/**
 * Resubscribe confirmation. A public form post must never flip an opted-out contact
 * back to subscribed, so an unsubscribed contact gets one email with a signed link and
 * only a click on that link does the PATCH. The signature is HMAC-SHA256 over the
 * lowercased address and the expiry, keyed by CI_CONFIRM_SECRET.
 */

export const CONFIRM_TTL_SECONDS = 48 * 60 * 60;

async function hmacHex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
	return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
	const x = new TextEncoder().encode(a);
	const y = new TextEncoder().encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < y.length; i++) diff |= (x[i] ?? 0) ^ y[i];
	return diff === 0;
}

export async function signConfirmation(secret: string, email: string, expires: number): Promise<string> {
	return hmacHex(secret, `${email.trim().toLowerCase()}\n${expires}`);
}

export async function confirmationLink(origin: string, secret: string, email: string, nowSeconds: number): Promise<string> {
	const expires = nowSeconds + CONFIRM_TTL_SECONDS;
	const sig = await signConfirmation(secret, email, expires);
	const query = new URLSearchParams({ e: email.trim().toLowerCase(), x: String(expires), s: sig });
	return `${origin}/api/ci/resubscribe?${query.toString()}`;
}

export type Verdict = 'ok' | 'expired' | 'invalid';

export async function verifyConfirmation(secret: string, params: URLSearchParams | FormData, nowSeconds: number): Promise<Verdict> {
	const email = String(params.get('e') ?? '');
	const expires = Number(params.get('x'));
	const sig = String(params.get('s') ?? '');
	if (!email || !Number.isInteger(expires) || !sig) return 'invalid';
	const expected = await signConfirmation(secret, email, expires);
	if (!constantTimeEqual(sig, expected)) return 'invalid';
	return expires > nowSeconds ? 'ok' : 'expired';
}

export function confirmationBody(link: string): string {
	return `You asked to get emails from Miami CI again.

Confirm here: ${link}

The link works for 48 hours. If it was not you, ignore this and nothing changes.

Max`;
}

function shell(title: string, bodyHtml: string): string {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:Georgia,serif;max-width:32rem;margin:15vh auto;padding:0 1rem">${bodyHtml}<p><a href="https://miamicontactimprov.com/">miamicontactimprov.com</a></p></body></html>`;
}

export function plainPage(title: string, message: string): string {
	return shell(title, `<p>${message}</p>`);
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A GET must have no side effects (mail scanners and link previews fetch links), so the
// link only shows this page; the button posts the same signed values back.
export function confirmPage(email: string, expires: string, sig: string): string {
	const hidden = (name: string, value: string) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;
	return shell(
		'Confirm',
		`<p>Get emails from Miami CI again?</p><form method="post" action="/api/ci/resubscribe">${hidden('e', email)}${hidden('x', expires)}${hidden('s', sig)}<button type="submit" style="font:inherit;padding:.5rem 1rem">Confirm</button></form>`,
	);
}
