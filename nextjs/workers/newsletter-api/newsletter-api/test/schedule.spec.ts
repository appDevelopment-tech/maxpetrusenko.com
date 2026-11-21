import { describe, it, expect } from 'vitest';
import { EVENTS, resolveEvent, kindAvailableForEvent, type ScheduledEvent } from '../src/schedule';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function cutoffOf(date: string): number {
	const event = EVENTS.find((e) => e.date === date)!;
	return new Date(event.start).getTime() - TWO_HOURS_MS;
}

describe('resolveEvent (kind: class)', () => {
	it('picks the first event when now is well before its cutoff', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		const result = resolveEvent(now, 'class');
		expect(result && 'event' in result && result.event.date).toBe(EVENTS[0].date);
		expect(result && 'closed' in result && result.closed).toBe(false);
	});

	it('reports a date closed exactly at its cutoff', () => {
		const now = new Date(cutoffOf('2026-10-09'));
		const result = resolveEvent(now, 'class', '2026-10-09');
		expect(result).toEqual({
			event: EVENTS.find((e) => e.date === '2026-10-09'),
			cutoff: new Date(cutoffOf('2026-10-09')),
			closed: true,
		});
	});

	it('reports a date closed one second after its cutoff but before start', () => {
		const now = new Date(cutoffOf('2026-10-09') + 1000);
		const result = resolveEvent(now, 'class', '2026-10-09');
		expect(result && 'closed' in result && result.closed).toBe(true);
		expect(result && 'event' in result && result.event.date).toBe('2026-10-09');
	});

	it('falls back to the last event, closed, once every cutoff has passed', () => {
		const now = new Date('2031-01-01T00:00:00-05:00');
		const result = resolveEvent(now, 'class');
		expect(result && 'event' in result && result.event.date).toBe(EVENTS[EVENTS.length - 1].date);
		expect(result && 'closed' in result && result.closed).toBe(true);
	});

	it('reports an explicit date closed when its own cutoff has already passed, even if later dates are still open', () => {
		const now = new Date(cutoffOf('2026-10-16') + 1000);
		const result = resolveEvent(now, 'class', '2026-10-02');
		expect(result && 'event' in result && result.event.date).toBe('2026-10-02');
		expect(result && 'closed' in result && result.closed).toBe(true);
	});

	it('returns an unknown_date error for a date not in EVENTS', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		const result = resolveEvent(now, 'class', '2026-12-26');
		expect(result).toEqual({ error: 'unknown_date' });
	});

	it('is pure: never touches the wall clock, only the now it is given', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		const first = resolveEvent(now, 'class');
		const second = resolveEvent(now, 'class');
		expect(first).toEqual(second);
	});

	describe('DST offset split', () => {
		it('keeps the Oct 30 class on EDT (-04:00)', () => {
			const event = EVENTS.find((e) => e.date === '2026-10-30')!;
			expect(event.start.endsWith('-04:00')).toBe(true);
			expect(event.end.endsWith('-04:00')).toBe(true);
		});

		it('switches the Nov 6 class to EST (-05:00)', () => {
			const event = EVENTS.find((e) => e.date === '2026-11-06')!;
			expect(event.start.endsWith('-05:00')).toBe(true);
			expect(event.end.endsWith('-05:00')).toBe(true);
		});

		it('is generated: every Friday from 2026-10-02 to the end of 2028, chronological, 7-9pm', () => {
			expect(EVENTS[0].date).toBe('2026-10-02');
			expect(EVENTS.slice(0, 8).map((e) => e.date)).toEqual([
				'2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30', '2026-11-06', '2026-11-13', '2026-11-20',
			]);
			expect(EVENTS[8].date).toBe('2026-11-27');
			expect(EVENTS[EVENTS.length - 1].date.startsWith('2028-')).toBe(true);
			for (let i = 0; i < EVENTS.length; i++) {
				const event = EVENTS[i];
				expect(event.type).toBe('class');
				expect(event.title).toBe('Fundamentals: Friday class');
				expect(event.start).toContain('T19:00:00');
				expect(event.end).toContain('T21:00:00');
				expect(new Date(`${event.date}T12:00:00Z`).getUTCDay()).toBe(5);
				if (i > 0) {
					const gap = new Date(`${event.date}T12:00:00Z`).getTime() - new Date(`${EVENTS[i - 1].date}T12:00:00Z`).getTime();
					expect(gap).toBe(7 * 24 * 60 * 60 * 1000);
				}
			}
		});

		it('every generated start reads 19:00 America/New_York on its own date (DST rule matches Intl)', () => {
			const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' });
			for (const event of EVENTS) {
				const parts = Object.fromEntries(fmt.formatToParts(new Date(event.start)).map((p) => [p.type, p.value]));
				expect(`${parts.year}-${parts.month}-${parts.day}`).toBe(event.date);
				expect(`${parts.hour}:${parts.minute}`).toBe('19:00');
				const endParts = Object.fromEntries(fmt.formatToParts(new Date(event.end)).map((p) => [p.type, p.value]));
				expect(`${endParts.hour}:${endParts.minute}`).toBe('21:00');
			}
		});

		it('has a sellable date after Nov 20, 2026 (Black Friday, Nov 27, is on the calendar)', () => {
			const now = new Date('2026-11-21T12:00:00-05:00');
			const result = resolveEvent(now, 'class');
			expect(result && 'event' in result && result.event.date).toBe('2026-11-27');
			expect(result && 'closed' in result && result.closed).toBe(false);
			expect(EVENTS.find((e) => e.date === '2026-11-27')!.start.endsWith('-05:00')).toBe(true);
			expect(EVENTS.find((e) => e.date === '2027-03-19')!.start.endsWith('-04:00')).toBe(true);
			expect(EVENTS.find((e) => e.date === '2027-03-12')!.start.endsWith('-05:00')).toBe(true);
		});
	});
});

describe('resolveEvent (kind: jam / combo) -- no such dates exist yet', () => {
	it('reports kind_unavailable for jam, since no EVENTS entry supports it', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		expect(resolveEvent(now, 'jam')).toEqual({ error: 'kind_unavailable' });
	});

	it('reports kind_unavailable for combo, since no EVENTS entry supports it', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		expect(resolveEvent(now, 'combo')).toEqual({ error: 'kind_unavailable' });
	});

	it('reports kind_unavailable for an explicit date that exists but does not support the requested kind', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		// 2026-10-02 is a plain 'class' day; jam/combo are not purchasable for it.
		expect(resolveEvent(now, 'jam', '2026-10-02')).toEqual({ error: 'kind_unavailable' });
		expect(resolveEvent(now, 'combo', '2026-10-02')).toEqual({ error: 'kind_unavailable' });
	});
});

describe('kindAvailableForEvent', () => {
	const classEvent: ScheduledEvent = { date: '2099-01-01', start: '2099-01-01T19:00:00-05:00', end: '2099-01-01T21:00:00-05:00', type: 'class', title: 'x' };
	const jamEvent: ScheduledEvent = { ...classEvent, type: 'jam' };
	const comboEvent: ScheduledEvent = { ...classEvent, type: 'combo-capable' };

	it('a class-type event only sells class', () => {
		expect(kindAvailableForEvent(classEvent, 'class')).toBe(true);
		expect(kindAvailableForEvent(classEvent, 'jam')).toBe(false);
		expect(kindAvailableForEvent(classEvent, 'combo')).toBe(false);
	});

	it('a jam-type event only sells jam', () => {
		expect(kindAvailableForEvent(jamEvent, 'class')).toBe(false);
		expect(kindAvailableForEvent(jamEvent, 'jam')).toBe(true);
		expect(kindAvailableForEvent(jamEvent, 'combo')).toBe(false);
	});

	it('a combo-capable event sells all three kinds', () => {
		expect(kindAvailableForEvent(comboEvent, 'class')).toBe(true);
		expect(kindAvailableForEvent(comboEvent, 'jam')).toBe(true);
		expect(kindAvailableForEvent(comboEvent, 'combo')).toBe(true);
	});
});
