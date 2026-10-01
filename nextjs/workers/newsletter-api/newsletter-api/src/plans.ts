/** The four purchasable plans and the Stripe behavior each one checks out with. */

export type Plan = 'ticket' | 'intro' | 'monthly' | 'annual';

const PLANS: Plan[] = ['ticket', 'intro', 'monthly', 'annual'];

export function isPlan(value: unknown): value is Plan {
	return typeof value === 'string' && (PLANS as string[]).includes(value);
}

export const PLAN_LOOKUP_KEYS: Record<Exclude<Plan, 'ticket'>, string> = {
	intro: 'ci-intro-pack',
	monthly: 'ci-membership-monthly',
	annual: 'ci-membership-annual',
};

export interface PlanConfig {
	mode: 'payment' | 'subscription';
	allowPromotionCodes: boolean;
}

// Confirmed by Max, 2026-10-01: ticket and intro allow promo codes; monthly and
// annual (memberships) never do. monthly is a real Stripe subscription; annual
// is a flat $540 one-time charge that grants 12 months, not a yearly-billed
// subscription — kept simple deliberately.
export function planConfig(plan: Plan): PlanConfig {
	if (plan === 'monthly') {
		return { mode: 'subscription', allowPromotionCodes: false };
	}
	if (plan === 'annual') {
		return { mode: 'payment', allowPromotionCodes: false };
	}
	// ticket, intro
	return { mode: 'payment', allowPromotionCodes: true };
}
