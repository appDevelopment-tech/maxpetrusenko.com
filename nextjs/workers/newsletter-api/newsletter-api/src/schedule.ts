/**
 * The Fundamentals class calendar, as a reusable config.
 *
 * Nothing in the UI reads this file yet; it exists so the checkout logic (and,
 * later, check-in/QR/entitlements work) has one place to resolve "which class is
 * this ticket for" instead of each caller hand-rolling dates.
 */

export type EventType = 'class' | 'jam';

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

// The Stripe price lookup key for a drop-in ticket to each event type. `jam` is
// null: no jam events are in EVENTS yet and no Stripe price exists for one.
// This is deliberate future-proofing, not a bug — see
// docs/plans/pricing-events-config.md in the site repo (maxpetrusenko/
// miamicontactimprov), which carries the full pricing model.
export const DROP_IN_LOOKUP_KEY_BY_TYPE: Record<EventType, string | null> = {
	class: 'ci-ticket-online-friday',
	jam: null,
};

// $15, documented default once a jam price exists. Unused until then.
export const DEFAULT_JAM_DROP_IN_CENTS = 1500;

export type ResolvedTicketEvent = { event: ScheduledEvent; cutoff: Date; closed: boolean };

function cutoffFor(event: ScheduledEvent): Date {
	return new Date(new Date(event.start).getTime() - 2 * 60 * 60 * 1000);
}

/**
 * Resolves which scheduled event a ticket purchase is for.
 *
 * Takes `now` explicitly rather than reading the clock itself, so it is a pure
 * function: the same inputs always give the same answer, and a test can hand it
 * any instant without mocking global time.
 */
export function resolveTicketEvent(
	now: Date,
	requestedDate?: string,
): ResolvedTicketEvent | { error: 'unknown_date' } | null {
	if (EVENTS.length === 0) return null;

	if (requestedDate) {
		const event = EVENTS.find((e) => e.date === requestedDate);
		if (!event) return { error: 'unknown_date' };
		const cutoff = cutoffFor(event);
		return { event, cutoff, closed: now.getTime() >= cutoff.getTime() };
	}

	for (const event of EVENTS) {
		const cutoff = cutoffFor(event);
		if (now.getTime() < cutoff.getTime()) {
			return { event, cutoff, closed: false };
		}
	}

	// Every cutoff has passed: fall back to the last event so the caller still
	// has something to report as closed, with a door link, rather than crashing.
	const event = EVENTS[EVENTS.length - 1];
	return { event, cutoff: cutoffFor(event), closed: true };
}
