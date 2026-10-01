/**
 * Minimal Stripe REST client via `fetch`. No `stripe-node` dependency: this
 * codebase already talks to Resend and Meta's Graph API over raw `fetch`
 * (see `resendPost` / `forwardToMeta` in index.ts), so this follows the same
 * convention rather than adding an SDK.
 */

const STRIPE_API = 'https://api.stripe.com/v1';

export async function findPriceByLookupKey(secretKey: string, lookupKey: string): Promise<{ id: string } | null> {
	const query = new URLSearchParams();
	query.append('lookup_keys[]', lookupKey);
	query.set('active', 'true');

	const response = await fetch(`${STRIPE_API}/prices?${query.toString()}`, {
		headers: { Authorization: `Bearer ${secretKey}` },
	});
	if (!response.ok) return null;

	const payload = (await response.json().catch(() => null)) as { data?: Array<{ id: string }> } | null;
	const price = payload?.data?.[0];
	return price ? { id: price.id } : null;
}

export interface CreateCheckoutSessionParams {
	mode: 'payment' | 'subscription';
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
	body.set('mode', params.mode);
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
