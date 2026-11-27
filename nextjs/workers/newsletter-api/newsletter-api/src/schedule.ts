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

// Every Friday evening, 7:00-9:00 PM America/New_York, at Inner Motion Dance
// Studio, Hallandale Beach, generated rather than listed by hand so checkout
// always has sellable dates. The first class was 2026-10-02; the calendar runs to
// the end of 2028 (extend SCHEDULE_END_YEAR before it runs out). Holiday Fridays
// are not skipped: if a class is cancelled, remove nothing here, refund or credit
// the buyers instead (see the membership credit rules).
//
// The UTC offset flips between -04:00 (EDT) and -05:00 (EST) on the US DST dates
// (second Sunday of March, first Sunday of November). Get this wrong and the
// classes after a change read an hour off on any calendar or cutoff math that
// trusts the ISO string. `offsetFor` encodes the rule; the tests check it against
// Intl for every generated date.
//
// All entries are `type: 'class'` today. No `'jam'` or `'combo-capable'` entries
// exist yet -- that's deliberate future-proofing per Max (2026-10-01), not a
// gap to fill here. See docs/plans/pricing-events-config.md in the site repo
// (maxpetrusenko/miamicontactimprov) for the full pricing model this config
// supports once jam/combo nights are added.
export const FIRST_CLASS_DATE = '2026-10-02';
export const SCHEDULE_END_YEAR = 2028;

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function nthSunday(year: number, month0: number, n: number): number {
	const firstDow = new Date(Date.UTC(year, month0, 1)).getUTCDay();
	const firstSunday = 1 + ((7 - firstDow) % 7);
	return firstSunday + (n - 1) * 7;
}

/** '-04:00' (EDT) or '-05:00' (EST) for a local America/New_York calendar day at 19:00. */
export function offsetFor(year: number, month1: number, day: number): '-04:00' | '-05:00' {
	const m = month1 - 1;
	const dstStart = Date.UTC(year, 2, nthSunday(year, 2, 2));
	const dstEnd = Date.UTC(year, 10, nthSunday(year, 10, 1));
	const day0 = Date.UTC(year, m, day);
	return day0 >= dstStart && day0 < dstEnd ? '-04:00' : '-05:00';
}

export function generateFridayClasses(firstDate: string, endYear: number): ScheduledEvent[] {
	const [y0, m0, d0] = firstDate.split('-').map(Number);
	const out: ScheduledEvent[] = [];
	for (let t = Date.UTC(y0, m0 - 1, d0); ; t += 7 * 24 * 60 * 60 * 1000) {
		const d = new Date(t);
		if (d.getUTCFullYear() > endYear) break;
		const y = d.getUTCFullYear();
		const m = d.getUTCMonth() + 1;
		const day = d.getUTCDate();
		const date = `${y}-${pad2(m)}-${pad2(day)}`;
		const off = offsetFor(y, m, day);
		out.push({ date, start: `${date}T19:00:00${off}`, end: `${date}T21:00:00${off}`, type: 'class', title: TITLE });
	}
	return out;
}

export const EVENTS: ScheduledEvent[] = generateFridayClasses(FIRST_CLASS_DATE, SCHEDULE_END_YEAR);

// The Stripe price lookup key for each drop-in kind. All three exist in Stripe
// test mode already (created via scripts/stripe_setup.py in the site repo):
// ci-ticket-online-friday ($20), ci-jam-dropin ($15), ci-combo-dropin ($30).
export const KIND_LOOKUP_KEYS: Record<DropInKind, string> = {
	class: 'ci-ticket-online-friday',
	jam: 'ci-jam-dropin',
	combo: 'ci-combo-dropin',
};

// Day-of class price: $20 until 3:00 PM America/New_York on the class date, then $30
// until online sales close (2 hours before the 7 PM start). Class tickets only: the
// jam ($15) and class+jam combo ($30) prices are deliberately unchanged. Both prices
// live on the same Stripe product; the Worker picks the lookup key server-side.
export const DAYOF_LOOKUP_KEY = 'ci-class-dayof-30';
export const DAYOF_SWITCH_HOUR_ET = 15;
export const STANDARD_CLASS_CENTS = 2000;
export const DAYOF_CLASS_CENTS = 3000;

export type PriceTier = 'standard' | 'dayof';
export interface ClassPrice {
	tier: PriceTier;
	amount: number; // cents, for display; checkout reads the real amount from Stripe
	lookupKey: string;
	/** When the price next changes (the switch to day-of, or the end of online sales), or null. */
	changesAt: Date | null;
}

/** The instant the day-of price starts for an event: 15:00 on its date, in that date's Eastern offset. */
export function dayOfStart(event: ScheduledEvent): Date {
	const off = event.start.slice(-6);
	return new Date(`${event.date}T${String(DAYOF_SWITCH_HOUR_ET).padStart(2, '0')}:00:00${off}`);
}

/**
 * The class price for `event` at `now`. Pure and server-side only: checkout never
 * reads a price or a time from the client. Boundary: 14:59:59 -> $20, 15:00:00 -> $30.
 * Whether sales are still open is a separate question (`resolveEvent().closed`).
 */
export function classPriceFor(now: Date, event: ScheduledEvent): ClassPrice {
	const start = dayOfStart(event).getTime();
	const t = now.getTime();
	if (t >= start) {
		return { tier: 'dayof', amount: DAYOF_CLASS_CENTS, lookupKey: DAYOF_LOOKUP_KEY, changesAt: cutoffFor(event) };
	}
	return { tier: 'standard', amount: STANDARD_CLASS_CENTS, lookupKey: KIND_LOOKUP_KEYS.class, changesAt: new Date(start) };
}

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

// Self check-in opens 30 minutes before the 7:00 PM start (6:30 PM) and closes at the 9:00 PM end.
export const CHECKIN_OPENS_BEFORE_MS = 30 * 60 * 1000;

function easternDay(now: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * The class tonight, if `now` falls on a class date (Eastern), and whether check-in is open.
 * null on any other day. Pure: takes `now`.
 */
export function classWindow(now: Date): { event: ScheduledEvent; open: boolean; opensAt: Date; closesAt: Date } | null {
	const event = EVENTS.find((e) => e.date === easternDay(now));
	if (!event) return null;
	const opensAt = new Date(new Date(event.start).getTime() - CHECKIN_OPENS_BEFORE_MS);
	const closesAt = new Date(event.end);
	const t = now.getTime();
	return { event, open: t >= opensAt.getTime() && t <= closesAt.getTime(), opensAt, closesAt };
}
