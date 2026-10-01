import { describe, it, expect } from 'vitest';
import { isPlan, planConfig, PLAN_LOOKUP_KEYS, type Plan } from '../src/plans';

describe('isPlan', () => {
	it('accepts the four known plans', () => {
		expect(isPlan('ticket')).toBe(true);
		expect(isPlan('intro')).toBe(true);
		expect(isPlan('monthly')).toBe(true);
		expect(isPlan('annual')).toBe(true);
	});

	it('rejects garbage', () => {
		expect(isPlan('weekly')).toBe(false);
		expect(isPlan('')).toBe(false);
		expect(isPlan(undefined)).toBe(false);
		expect(isPlan(null)).toBe(false);
		expect(isPlan(42)).toBe(false);
		expect(isPlan({})).toBe(false);
	});
});

describe('planConfig', () => {
	const expected: Record<Plan, { mode: 'payment' | 'subscription'; allowPromotionCodes: boolean }> = {
		ticket: { mode: 'payment', allowPromotionCodes: true },
		intro: { mode: 'payment', allowPromotionCodes: true },
		monthly: { mode: 'subscription', allowPromotionCodes: false },
		annual: { mode: 'payment', allowPromotionCodes: false },
	};

	for (const plan of Object.keys(expected) as Plan[]) {
		it(`sets mode and allowPromotionCodes correctly for ${plan}`, () => {
			expect(planConfig(plan)).toEqual(expected[plan]);
		});
	}

	it('is a subscription only for monthly', () => {
		const subscriptionPlans = (Object.keys(expected) as Plan[]).filter((p) => planConfig(p).mode === 'subscription');
		expect(subscriptionPlans).toEqual(['monthly']);
	});

	it('never allows promotion codes on a membership', () => {
		expect(planConfig('monthly').allowPromotionCodes).toBe(false);
		expect(planConfig('annual').allowPromotionCodes).toBe(false);
	});
});

describe('PLAN_LOOKUP_KEYS', () => {
	it('has a Stripe lookup key for every non-ticket plan', () => {
		expect(PLAN_LOOKUP_KEYS).toEqual({
			intro: 'ci-intro-pack',
			monthly: 'ci-membership-monthly',
			annual: 'ci-membership-annual',
		});
	});
});
