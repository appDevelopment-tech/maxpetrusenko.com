/**
 * Minimal Stripe REST client via `fetch`. No `stripe-node` dependency: this
 * codebase already talks to Resend and Meta's Graph API over raw `fetch`
 * (see `resendPost` / `forwardToMeta` in index.ts), so this follows the same
 * convention rather than adding an SDK.
 */

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * STRIPE_MODE ('test' default, or 'live') must match the key's own prefix
 * (sk_test_/rk_test_ vs sk_live_/rk_live_). A live key in a test deploy, or the
 * reverse, is refused before any Stripe call. Returns an error string or null.
 */
export function stripeModeError(secretKey: string, mode: string | undefined): string | null {
	const want = mode ?? 'test';
	if (want !== 'test' && want !== 'live') return `Unknown STRIPE_MODE ${want}`;
	const ok = secretKey.startsWith(`sk_${want}_`) || secretKey.startsWith(`rk_${want}_`);
	return ok ? null : `Stripe key does not match STRIPE_MODE=${want}`;
}

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
	// Locks the Checkout email field. Set for the first-class price, so the paid
	// session carries the same address the offer was issued to.
	customerEmail?: string;
	// Unix seconds. Stripe requires at least 30 minutes from now.
	expiresAt?: number;
	// Sent as the Idempotency-Key header: a retry or a double submit with the
	// same key and the same parameters gets the same session back.
	idempotencyKey?: string;
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
	if (params.expiresAt) {
		body.set('expires_at', String(params.expiresAt));
	}
	if (params.customerEmail) {
		body.set('customer_email', params.customerEmail);
	}
	// Same metadata on the session and on its PaymentIntent, so a refund or a
	// dashboard search from either side shows which offer the sale used.
	for (const [key, value] of Object.entries(params.metadata)) {
		if (!value) continue; // Stripe reads an empty value as "unset"; skip it
		body.set(`metadata[${key}]`, value);
		body.set(`payment_intent_data[metadata][${key}]`, value);
	}

	const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			...(params.idempotencyKey ? { 'Idempotency-Key': params.idempotencyKey } : {}),
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

/**
 * True when this email already has a completed Checkout Session for a CI
 * product (metadata.product starts with "ci-"). The Stripe account is shared
 * with other products, hence the filter. null when Stripe could not answer, so
 * the caller can fail closed instead of guessing.
 */
export async function hasCompletedCiPurchase(secretKey: string, email: string): Promise<boolean | null> {
	const query = new URLSearchParams();
	query.set('status', 'complete');
	// Lowercased and trimmed: every address this Worker stores is, and the
	// first-class Checkout locks customer_email to that same form.
	query.set('customer_details[email]', email.trim().toLowerCase());
	query.set('limit', '100');

	const response = await fetch(`${STRIPE_API}/checkout/sessions?${query.toString()}`, {
		headers: { Authorization: `Bearer ${secretKey}` },
	});
	if (!response.ok) return null;

	const payload = (await response.json().catch(() => null)) as
		| { data?: Array<{ metadata?: Record<string, string> | null }> }
		| null;
	if (!payload?.data) return null;
	return payload.data.some((session) => (session.metadata?.product ?? '').startsWith('ci-'));
}
