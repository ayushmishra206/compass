import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeDesired } from './scheduler';

describe('computeDesired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns morning-brief at briefingHour today and eod-reflection at reflectionHour today when called before both', () => {
    // 2026-05-09 06:00:00 local time — both hours still ahead today.
    vi.setSystemTime(new Date(2026, 4, 9, 6, 0, 0));

    const desired = computeDesired();

    expect(desired).toHaveLength(2);
    const morning = desired.find((d) => d.name === 'morning-brief')!;
    const eod = desired.find((d) => d.name === 'eod-reflection')!;
    expect(new Date(morning.when).getHours()).toBe(8);
    expect(new Date(morning.when).getDate()).toBe(9);
    expect(new Date(eod.when).getHours()).toBe(18);
    expect(new Date(eod.when).getDate()).toBe(9);
  });

  it('rolls morning-brief to tomorrow when called after briefingHour', () => {
    // 2026-05-09 09:00:00 — past briefingHour=8, before reflectionHour=18.
    vi.setSystemTime(new Date(2026, 4, 9, 9, 0, 0));

    const desired = computeDesired();
    const morning = desired.find((d) => d.name === 'morning-brief')!;
    const eod = desired.find((d) => d.name === 'eod-reflection')!;

    expect(new Date(morning.when).getDate()).toBe(10);
    expect(new Date(morning.when).getHours()).toBe(8);
    expect(new Date(eod.when).getDate()).toBe(9);
  });

  it('rolls both to tomorrow when called after reflectionHour', () => {
    // 2026-05-09 23:00:00 — past both today.
    vi.setSystemTime(new Date(2026, 4, 9, 23, 0, 0));

    const desired = computeDesired();
    expect(desired.every((d) => new Date(d.when).getDate() === 10)).toBe(true);
  });
});
