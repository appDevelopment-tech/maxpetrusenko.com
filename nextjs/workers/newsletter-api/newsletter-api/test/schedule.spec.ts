import { describe, it, expect } from 'vitest';
import { EVENTS, resolveTicketEvent } from '../src/schedule';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function cutoffOf(date: string): number {
	const event = EVENTS.find((e) => e.date === date)!;
	return new Date(event.start).getTime() - TWO_HOURS_MS;
}

describe('resolveTicketEvent', () => {
	it('picks the first event when now is well before its cutoff', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		const result = resolveTicketEvent(now);
		expect(result && 'event' in result && result.event.date).toBe(EVENTS[0].date);
		expect(result && 'closed' in result && result.closed).toBe(false);
	});

	it('reports a date closed exactly at its cutoff', () => {
		const now = new Date(cutoffOf('2026-10-09'));
		const result = resolveTicketEvent(now, '2026-10-09');
		expect(result).toEqual({
			event: EVENTS.find((e) => e.date === '2026-10-09'),
			cutoff: new Date(cutoffOf('2026-10-09')),
			closed: true,
		});
	});

	it('reports a date closed one second after its cutoff but before start', () => {
		const now = new Date(cutoffOf('2026-10-09') + 1000);
		const result = resolveTicketEvent(now, '2026-10-09');
		expect(result && 'closed' in result && result.closed).toBe(true);
		expect(result && 'event' in result && result.event.date).toBe('2026-10-09');
	});

	it('falls back to the last event, closed, once every cutoff has passed', () => {
		const now = new Date('2026-12-01T00:00:00-05:00');
		const result = resolveTicketEvent(now);
		expect(result && 'event' in result && result.event.date).toBe(EVENTS[EVENTS.length - 1].date);
		expect(result && 'closed' in result && result.closed).toBe(true);
	});

	it('reports an explicit date closed when its own cutoff has already passed, even if later dates are still open', () => {
		const now = new Date(cutoffOf('2026-10-16') + 1000);
		const result = resolveTicketEvent(now, '2026-10-02');
		expect(result && 'event' in result && result.event.date).toBe('2026-10-02');
		expect(result && 'closed' in result && result.closed).toBe(true);
	});

	it('returns an unknown_date error for a date not in EVENTS', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		const result = resolveTicketEvent(now, '2026-12-25');
		expect(result).toEqual({ error: 'unknown_date' });
	});

	it('is pure: never touches the wall clock, only the now it is given', () => {
		const now = new Date('2026-09-01T00:00:00-04:00');
		const first = resolveTicketEvent(now);
		const second = resolveTicketEvent(now);
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

		it('has all eight classes, chronological, 7-9pm', () => {
			expect(EVENTS).toHaveLength(8);
			for (const event of EVENTS) {
				expect(event.type).toBe('class');
				expect(event.title).toBe('Fundamentals: Friday class');
				expect(event.start).toContain('T19:00:00');
				expect(event.end).toContain('T21:00:00');
			}
		});
	});
});
