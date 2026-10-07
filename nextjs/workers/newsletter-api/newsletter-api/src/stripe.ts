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

/**
 * Creates a single-use promotion code on an existing coupon. `max_redemptions=1`
 * is what makes the offer once per person: the code goes to one inbox and dies on
 * first use. Returns the code string, or null on any failure (the caller logs and
 * skips the email rather than sending a blank or unusable code).
 */
export async function createSingleUseCode(secretKey: string, couponId: string): Promise<string | null> {
	// A collision on a random 6-char code is a 400; one retry covers it.
	for (let attempt = 0; attempt < 2; attempt++) {
		const code = `CI10-${randomCodeSuffix()}`;
		const body = new URLSearchParams();
		body.set('coupon', couponId);
		body.set('code', code);
		body.set('max_redemptions', '1');
		try {
			const response = await fetch(`${STRIPE_API}/promotion_codes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${secretKey}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: body.toString(),
			});
			const payload = (await response.json().catch(() => null)) as
				| { code?: string; error?: { message?: string } }
				| null;
			if (response.ok && payload?.code) return payload.code;
			console.error('[Promotion code failed]', response.status, payload?.error?.message ?? '');
		} catch (error) {
			console.error('[Promotion code error]', error);
		}
	}
	return null;
}
