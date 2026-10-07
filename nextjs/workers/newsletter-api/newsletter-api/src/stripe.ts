/**
 * Minimal Stripe REST client via `fetch`. No `stripe-node` dependency: this
 * codebase already talks to Resend and Meta's Graph API over raw `fetch`
 * (see `resendPost` / `forwardToMeta` in index.ts), so this follows the same
 * convention rather than adding an SDK.
 */

const STRIPE_API = 'https://api.stripe.com/v1';

export async function findPriceByLookupKey(secretKey: string, lookupKey: string): Promise<{ id: string; unitAmount: number } | null> {
	const query = new URLSearchParams();
	query.append('lookup_keys[]', lookupKey);
	query.set('active', 'true');

	const response = await fetch(`${STRIPE_API}/prices?${query.toString()}`, {
		headers: { Authorization: `Bearer ${secretKey}` },
	});
	if (!response.ok) return null;

	const payload = (await response.json().catch(() => null)) as
		| { data?: Array<{ id: string; unit_amount?: number | null }> }
		| null;
	const price = payload?.data?.[0];
	return price ? { id: price.id, unitAmount: price.unit_amount ?? 0 } : null;
}

export interface CreateCheckoutSessionParams {
	priceId: string;
	allowPromotionCodes: boolean;
	successUrl: string;
	cancelUrl: string;
	metadata: Record<string, string>;
}

export async function createCheckoutSession(
	secretKey: string,
	params: CreateCheckoutSessionParams,
): Promise<{ url: string } | { error: string }> {
	const body = new URLSearchParams();
	// Every drop-in kind (class/jam/combo) is a one-time payment -- memberships
	// (which would have needed 'subscription' mode) are deferred, see
	// docs/plans/pricing-events-config.md in the site repo.
	body.set('mode', 'payment');
	body.set('line_items[0][price]', params.priceId);
	body.set('line_items[0][quantity]', '1');
	body.set('phone_number_collection[enabled]', 'true');
	body.set('success_url', params.successUrl);
	body.set('cancel_url', params.cancelUrl);
	// Only included when true: omitting it entirely when false avoids any
	// ambiguity about how Stripe treats an explicit `false`.
	if (params.allowPromotionCodes) {
		body.set('allow_promotion_codes', 'true');
	}
	for (const [key, value] of Object.entries(params.metadata)) {
		body.set(`metadata[${key}]`, value);
	}

	const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: body.toString(),
	});

	const payload = (await response.json().catch(() => null)) as
		| { url?: string; error?: { message?: string } }
		| null;

	if (!response.ok) {
		return { error: payload?.error?.message ?? `Stripe error ${response.status}` };
	}
	if (!payload?.url) {
		return { error: 'Stripe did not return a checkout URL' };
	}
	return { url: payload.url };
}

// Unambiguous uppercase alphanumerics are not needed here: the code is pasted from an
// email, so the full A-Z0-9 set is fine. Rejection sampling keeps the draw uniform.
const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function randomCodeSuffix(length = 6): string {
	let out = '';
	while (out.length < length) {
		const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
		for (const byte of bytes) {
			if (byte < 252 && out.length < length) out += CODE_CHARS[byte % 36];
		}
	}
	return out;
}

// Pinned because Stripe moved the coupon reference on promotion code creation to
// `promotion[type]=coupon&promotion[coupon]=<id>` in this version; the body below is
// written for it and must not drift with the account's default version.
export const STRIPE_PROMO_VERSION = '2025-09-30.clover';
export const PROMO_TTL_SECONDS = 60 * 24 * 60 * 60;

export type PromoResult =
	| { ok: true; code: string }
	// definite: Stripe answered and refused, so the idempotency key is spent and the
	// next try needs a fresh key. Not definite (network error): retry the same key.
	| { ok: false; definite: boolean };

/**
 * Creates a single-use promotion code on an existing coupon. `max_redemptions=1`
 * makes the offer once per person; `expires_at` is 60 days out. The Idempotency-Key
 * lets a retry of the same attempt replay instead of minting a second code.
 */
export async function createSingleUseCode(
	secretKey: string,
	couponId: string,
	opts: { code: string; idempotencyKey: string; nowSeconds: number },
): Promise<PromoResult> {
	const body = new URLSearchParams();
	body.set('promotion[type]', 'coupon');
	body.set('promotion[coupon]', couponId);
	body.set('code', opts.code);
	body.set('max_redemptions', '1');
	body.set('expires_at', String(opts.nowSeconds + PROMO_TTL_SECONDS));
	try {
		const response = await fetch(`${STRIPE_API}/promotion_codes`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${secretKey}`,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Stripe-Version': STRIPE_PROMO_VERSION,
				'Idempotency-Key': opts.idempotencyKey,
			},
			body: body.toString(),
		});
		const payload = (await response.json().catch(() => null)) as
			| { code?: string; error?: { message?: string } }
			| null;
		if (response.ok && payload?.code) return { ok: true, code: payload.code };
		console.error('[Promotion code failed]', response.status, payload?.error?.message ?? '');
		return { ok: false, definite: true };
	} catch (error) {
		console.error('[Promotion code error]', error);
		return { ok: false, definite: false };
	}
}
