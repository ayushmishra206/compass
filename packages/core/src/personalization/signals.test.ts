import { describe, expect, it } from 'vitest';
import {
  burnoutEwma,
  computeFocusSignals,
  focusStreak,
  peakFocusHour,
  soundscapeCorrelations,
  type SessionRecord,
} from './signals';

const TZ = 'UTC';

const s = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  startedAt: '2026-08-02T09:00:00.000Z',
  durationMin: 25,
  completed: true,
  interruptCount: 0,
  ...over,
});

/** n completed sessions at a given hour, on distinct days. */
function atHour(hour: number, n: number, durationMin = 25): SessionRecord[] {
  return Array.from({ length: n }, (_, i) =>
    s({
      startedAt: `2026-07-${String(i + 1).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`,
      durationMin,
    }),
  );
}

describe('peakFocusHour', () => {
  it('is null with no sessions', () => {
    expect(peakFocusHour([], TZ)).toBeNull();
  });

  it('refuses to claim a peak from too few sessions', () => {
    expect(peakFocusHour(atHour(9, 4), TZ)).toBeNull();
  });

  it('reports the hour once there is enough evidence', () => {
    expect(peakFocusHour(atHour(9, 5), TZ)).toBe(9);
  });

  it('weights by minutes, not session count', () => {
    // Three short sessions at 14:00 vs two long ones at 9:00.
    const sessions = [...atHour(14, 3, 10), ...atHour(9, 2, 90)];
    expect(peakFocusHour(sessions, TZ)).toBe(9);
  });

  it('ignores abandoned sessions', () => {
    const sessions = [
      ...atHour(9, 5),
      ...atHour(22, 8).map((x) => ({ ...x, completed: false, durationMin: 200 })),
    ];
    expect(peakFocusHour(sessions, TZ)).toBe(9);
  });

  it('resolves ties to the earlier hour', () => {
    const sessions = [...atHour(9, 3, 30), ...atHour(15, 3, 30)];
    expect(peakFocusHour(sessions, TZ)).toBe(9);
  });

  it('respects the timezone when bucketing', () => {
    // 23:00 UTC on Jul 1 is 04:30 next day in Kolkata.
    const sessions = Array.from({ length: 5 }, (_, i) =>
      s({ startedAt: `2026-07-0${i + 1}T23:00:00.000Z` }),
    );
    expect(peakFocusHour(sessions, 'UTC')).toBe(23);
    expect(peakFocusHour(sessions, 'Asia/Kolkata')).toBe(4);
  });
});

describe('focusStreak', () => {
  const now = new Date('2026-08-02T18:00:00.000Z');

  it('is zero with no sessions', () => {
    expect(focusStreak([], TZ, now)).toEqual({ streakDays: 0, streakLastDate: null });
  });

  it('counts consecutive days ending today', () => {
    const sessions = [
      s({ startedAt: '2026-08-02T09:00:00.000Z' }),
      s({ startedAt: '2026-08-01T09:00:00.000Z' }),
      s({ startedAt: '2026-07-31T09:00:00.000Z' }),
    ];
    expect(focusStreak(sessions, TZ, now)).toEqual({
      streakDays: 3,
      streakLastDate: '2026-08-02',
    });
  });

  it('does not break a streak just because today has no session yet', () => {
    const sessions = [
      s({ startedAt: '2026-08-01T09:00:00.000Z' }),
      s({ startedAt: '2026-07-31T09:00:00.000Z' }),
    ];
    expect(focusStreak(sessions, TZ, now)).toEqual({
      streakDays: 2,
      streakLastDate: '2026-08-01',
    });
  });

  it('breaks when yesterday is also missing', () => {
    const sessions = [s({ startedAt: '2026-07-30T09:00:00.000Z' })];
    expect(focusStreak(sessions, TZ, now)).toEqual({ streakDays: 0, streakLastDate: null });
  });

  it('counts a day once no matter how many sessions it holds', () => {
    const sessions = [
      s({ startedAt: '2026-08-02T09:00:00.000Z' }),
      s({ startedAt: '2026-08-02T14:00:00.000Z' }),
      s({ startedAt: '2026-08-02T16:00:00.000Z' }),
    ];
    expect(focusStreak(sessions, TZ, now).streakDays).toBe(1);
  });

  it('ignores abandoned sessions', () => {
    const sessions = [
      s({ startedAt: '2026-08-02T09:00:00.000Z', completed: false }),
      s({ startedAt: '2026-08-01T09:00:00.000Z' }),
    ];
    expect(focusStreak(sessions, TZ, now).streakDays).toBe(1);
  });

  it('stops at the first gap rather than counting all active days', () => {
    const sessions = [
      s({ startedAt: '2026-08-02T09:00:00.000Z' }),
      // gap on 2026-08-01
      s({ startedAt: '2026-07-31T09:00:00.000Z' }),
      s({ startedAt: '2026-07-30T09:00:00.000Z' }),
    ];
    expect(focusStreak(sessions, TZ, now).streakDays).toBe(1);
  });
});

describe('soundscapeCorrelations', () => {
  it('is empty with no data', () => {
    expect(soundscapeCorrelations([])).toEqual({});
  });

  it('averages completed durations per soundscape', () => {
    const sessions = [
      s({ soundscapeId: 'rain', durationMin: 30 }),
      s({ soundscapeId: 'rain', durationMin: 50 }),
      s({ soundscapeId: 'cafe', durationMin: 20 }),
    ];
    expect(soundscapeCorrelations(sessions)).toEqual({ rain: 40, cafe: 20 });
  });

  it('excludes abandoned sessions', () => {
    const sessions = [
      s({ soundscapeId: 'rain', durationMin: 30 }),
      s({ soundscapeId: 'rain', durationMin: 90, completed: false }),
    ];
    expect(soundscapeCorrelations(sessions)).toEqual({ rain: 30 });
  });

  it('ignores sessions with no soundscape', () => {
    expect(soundscapeCorrelations([s({ soundscapeId: null })])).toEqual({});
  });
});

describe('burnoutEwma', () => {
  it('is zero with no data', () => {
    expect(burnoutEwma([], TZ)).toBe(0);
  });

  it('equals the rate when there is a single day', () => {
    const sessions = [
      s({ startedAt: '2026-08-01T09:00:00.000Z', interruptCount: 4 }),
      s({ startedAt: '2026-08-01T11:00:00.000Z', interruptCount: 2 }),
    ];
    expect(burnoutEwma(sessions, TZ)).toBe(3);
  });

  it('weights recent days more heavily', () => {
    const calm = [
      s({ startedAt: '2026-07-30T09:00:00.000Z', interruptCount: 0 }),
      s({ startedAt: '2026-07-31T09:00:00.000Z', interruptCount: 0 }),
      s({ startedAt: '2026-08-01T09:00:00.000Z', interruptCount: 10 }),
    ];
    const chaotic = [
      s({ startedAt: '2026-07-30T09:00:00.000Z', interruptCount: 10 }),
      s({ startedAt: '2026-07-31T09:00:00.000Z', interruptCount: 0 }),
      s({ startedAt: '2026-08-01T09:00:00.000Z', interruptCount: 0 }),
    ];
    expect(burnoutEwma(calm, TZ)).toBeGreaterThan(burnoutEwma(chaotic, TZ));
  });

  it('counts abandoned sessions — those interruptions are the signal', () => {
    const sessions = [
      s({ startedAt: '2026-08-01T09:00:00.000Z', interruptCount: 6, completed: false }),
    ];
    expect(burnoutEwma(sessions, TZ)).toBe(6);
  });
});

describe('computeFocusSignals', () => {
  const now = new Date('2026-08-02T18:00:00.000Z');

  it('summarises an empty history without throwing', () => {
    expect(computeFocusSignals([], TZ, now)).toEqual({
      peakFocusHour: null,
      streakDays: 0,
      streakLastDate: null,
      totalFocusMin: 0,
      completedSessions: 0,
    });
  });

  it('totals only completed focus minutes', () => {
    const sessions = [
      s({ durationMin: 25 }),
      s({ durationMin: 25 }),
      s({ durationMin: 90, completed: false }),
    ];
    const out = computeFocusSignals(sessions, TZ, now);
    expect(out.totalFocusMin).toBe(50);
    expect(out.completedSessions).toBe(2);
  });
});
