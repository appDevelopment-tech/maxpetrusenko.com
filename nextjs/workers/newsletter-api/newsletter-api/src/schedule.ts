/**
 * The Fundamentals class calendar, as a reusable config.
 *
 * Nothing in the UI reads this file yet; it exists so the checkout logic (and,
 * later, check-in/QR/entitlements work) has one place to resolve "which event
 * is this ticket for" instead of each caller hand-rolling dates.
 */

// 'class' and 'jam' are nights that run exactly one thing. 'combo-capable' is a
// night that runs both a class and a jam, so a buyer can purchase either one
// drop-in or the combined ticket for that date.
export type EventType = 'class' | 'jam' | 'combo-capable';

// What a buyer can actually check out with. Every event's type constrains
// which kinds are purchasable for it (see `kindAvailableForEvent`).
export type DropInKind = 'class' | 'jam' | 'combo';

export interface ScheduledEvent {
	date: string; // 'YYYY-MM-DD'
	start: string; // full ISO-8601 with the America/New_York offset for that date
	end: string; // same
	type: EventType;
	title: string;
}

const TITLE = 'Fundamentals: Friday class';

// Eight Friday evenings, 7:00-9:00 PM America/New_York, at Inner Motion Dance
// Studio, Hallandale Beach. The offset flips from -04:00 to -05:00 between the
// Oct 30 and Nov 6 classes: DST ends the first Sunday of November, which in
// 2026 is Nov 1. Get this wrong and the last three classes read an hour off on
// any calendar or cutoff math that trusts the ISO string, and nobody notices
// until someone shows up at the wrong time.
//
// All eight are `type: 'class'` today. No `'jam'` or `'combo-capable'` entries
// exist yet -- that's deliberate future-proofing per Max (2026-10-01), not a
// gap to fill here. See docs/plans/pricing-events-config.md in the site repo
// (maxpetrusenko/miamicontactimprov) for the full pricing model this config
// supports once jam/combo nights are added.
export const EVENTS: ScheduledEvent[] = [
	{ date: '2026-10-02', start: '2026-10-02T19:00:00-04:00', end: '2026-10-02T21:00:00-04:00', type: 'class', title: TITLE },
	{ date: '2026-10-09', start: '2026-10-09T19:00:00-04:00', end: '2026-10-09T21:00:00-04:00', type: 'class', title: TITLE },
	{ date: '2026-10-16', start: '2026-10-16T19:00:00-04:00', end: '2026-10-16T21:00:00-04:00', type: 'class', title: TITLE },
	{ date: '2026-10-23', start: '2026-10-23T19:00:00-04:00', end: '2026-10-23T21:00:00-04:00', type: 'class', title: TITLE },
	{ date: '2026-10-30', start: '2026-10-30T19:00:00-04:00', end: '2026-10-30T21:00:00-04:00', type: 'class', title: TITLE },
	{ date: '2026-11-06', start: '2026-11-06T19:00:00-05:00', end: '2026-11-06T21:00:00-05:00', type: 'class', title: TITLE },
	{ date: '2026-11-13', start: '2026-11-13T19:00:00-05:00', end: '2026-11-13T21:00:00-05:00', type: 'class', title: TITLE },
	{ date: '2026-11-20', start: '2026-11-20T19:00:00-05:00', end: '2026-11-20T21:00:00-05:00', type: 'class', title: TITLE },
];

// The Stripe price lookup key for each drop-in kind. All three exist in Stripe
// test mode already (created via scripts/stripe_setup.py in the site repo):
// ci-ticket-online-friday ($20), ci-jam-dropin ($15), ci-combo-dropin ($30).
export const KIND_LOOKUP_KEYS: Record<DropInKind, string> = {
	// Sliding scale $20-40 (Stripe custom_unit_amount, preset $20). Max, 2026-10-04.
	class: 'ci-class-sliding',
	jam: 'ci-jam-dropin',
	combo: 'ci-combo-dropin',
};

// Which kinds a given event type supports. A plain class/jam night only
// sells its own kind; a combo-capable night sells all three.
export function kindAvailableForEvent(event: ScheduledEvent, kind: DropInKind): boolean {
	if (event.type === 'combo-capable') return true;
	return event.type === kind;
}

export type ResolvedEvent = { event: ScheduledEvent; cutoff: Date; closed: boolean };
export type ResolveEventError = { error: 'unknown_date' } | { error: 'kind_unavailable' };

function cutoffFor(event: ScheduledEvent): Date {
	return new Date(new Date(event.start).getTime() - 2 * 60 * 60 * 1000);
}

/**
 * Resolves which scheduled event a purchase of `kind` is for.
 *
 * Takes `now` explicitly rather than reading the clock itself, so it is a pure
 * function: the same inputs always give the same answer, and a test can hand it
 * any instant without mocking global time.
 */
export function resolveEvent(now: Date, kind: DropInKind, requestedDate?: string): ResolvedEvent | ResolveEventError | null {
	if (EVENTS.length === 0) return null;

	if (requestedDate) {
		const event = EVENTS.find((e) => e.date === requestedDate);
		if (!event) return { error: 'unknown_date' };
		if (!kindAvailableForEvent(event, kind)) return { error: 'kind_unavailable' };
		const cutoff = cutoffFor(event);
		return { event, cutoff, closed: now.getTime() >= cutoff.getTime() };
	}

	const candidates = EVENTS.filter((e) => kindAvailableForEvent(e, kind));
	if (candidates.length === 0) return { error: 'kind_unavailable' };

	for (const event of candidates) {
		const cutoff = cutoffFor(event);
		if (now.getTime() < cutoff.getTime()) {
			return { event, cutoff, closed: false };
		}
	}

	// Every matching event's cutoff has passed: fall back to the last one so the
	// caller still has something to report as closed, with a door link, rather
	// than crashing.
	const event = candidates[candidates.length - 1];
	return { event, cutoff: cutoffFor(event), closed: true };
}
