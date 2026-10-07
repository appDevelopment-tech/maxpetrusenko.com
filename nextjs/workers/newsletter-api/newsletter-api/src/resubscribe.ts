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
	return hmacHex(secret, `${email.trim().toLowerCase()}.${expires}`);
}

export async function confirmationLink(origin: string, secret: string, email: string, nowSeconds: number): Promise<string> {
	const expires = nowSeconds + CONFIRM_TTL_SECONDS;
	const sig = await signConfirmation(secret, email, expires);
	const query = new URLSearchParams({ e: email.trim().toLowerCase(), x: String(expires), s: sig });
	return `${origin}/api/ci/resubscribe?${query.toString()}`;
}

export type Verdict = 'ok' | 'expired' | 'invalid';

export async function verifyConfirmation(secret: string, params: URLSearchParams, nowSeconds: number): Promise<Verdict> {
	const email = params.get('e') ?? '';
	const expires = Number(params.get('x'));
	const sig = params.get('s') ?? '';
	if (!email || !Number.isInteger(expires) || !sig) return 'invalid';
	const expected = await signConfirmation(secret, email, expires);
	if (!constantTimeEqual(sig, expected)) return 'invalid';
	return expires > nowSeconds ? 'ok' : 'expired';
}

export function confirmationBody(link: string): string {
	return `You asked to get emails from Contact Improv Miami again.

Confirm here: ${link}

The link works for 48 hours. If it was not you, ignore this and nothing changes.

Max`;
}

export function plainPage(title: string, message: string): string {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:Georgia,serif;max-width:32rem;margin:15vh auto;padding:0 1rem"><p>${message}</p><p><a href="https://miamicontactimprov.com/">miamicontactimprov.com</a></p></body></html>`;
}
