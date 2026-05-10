import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock defaults BEFORE importing the SUT so the async functions are stubbed.
vi.mock('./defaults', () => ({
  getBriefingHour: vi.fn(async () => 8),
  getReflectionHour: vi.fn(async () => 18),
}));

import { computeDesired, ensureAlarms, type AlarmsApi } from './scheduler';

interface MockAlarmsApi extends AlarmsApi {
  getAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

function makeAlarmsMock(
  initial: Array<{ name: string; scheduledTime: number }> = [],
): MockAlarmsApi {
  let store = [...initial];
  return {
    getAll: vi.fn(async () => store.slice()),
    create: vi.fn(async (name: string, info: { when: number }) => {
      store = store.filter((a) => a.name !== name).concat({ name, scheduledTime: info.when });
    }),
    clear: vi.fn(async (name: string) => {
      const before = store.length;
      store = store.filter((a) => a.name !== name);
      return store.length < before;
    }),
  };
}

describe('computeDesired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns morning-brief at briefingHour today and eod-reflection at reflectionHour today when called before both', async () => {
    // 2026-05-09 06:00:00 local time — both hours still ahead today.
    vi.setSystemTime(new Date(2026, 4, 9, 6, 0, 0));

    const desired = await computeDesired();

    expect(desired).toHaveLength(2);
    const morning = desired.find((d) => d.name === 'morning-brief')!;
    const eod = desired.find((d) => d.name === 'eod-reflection')!;
    expect(new Date(morning.when).getHours()).toBe(8);
    expect(new Date(morning.when).getDate()).toBe(9);
    expect(new Date(eod.when).getHours()).toBe(18);
    expect(new Date(eod.when).getDate()).toBe(9);
  });

  it('rolls morning-brief to tomorrow when called after briefingHour', async () => {
    // 2026-05-09 09:00:00 — past briefingHour=8, before reflectionHour=18.
    vi.setSystemTime(new Date(2026, 4, 9, 9, 0, 0));

    const desired = await computeDesired();
    const morning = desired.find((d) => d.name === 'morning-brief')!;
    const eod = desired.find((d) => d.name === 'eod-reflection')!;

    expect(new Date(morning.when).getDate()).toBe(10);
    expect(new Date(morning.when).getHours()).toBe(8);
    expect(new Date(eod.when).getDate()).toBe(9);
  });

  it('rolls both to tomorrow when called after reflectionHour', async () => {
    // 2026-05-09 23:00:00 — past both today.
    vi.setSystemTime(new Date(2026, 4, 9, 23, 0, 0));

    const desired = await computeDesired();
    expect(desired.every((d) => new Date(d.when).getDate() === 10)).toBe(true);
  });
});

describe('ensureAlarms — cold start', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9, 6, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates morning-brief and eod-reflection when no alarms exist', async () => {
    const api = makeAlarmsMock([]);

    await ensureAlarms(api);

    expect(api.create).toHaveBeenCalledTimes(2);
    expect(api.create).toHaveBeenCalledWith(
      'morning-brief',
      expect.objectContaining({ when: expect.any(Number) }),
    );
    expect(api.create).toHaveBeenCalledWith(
      'eod-reflection',
      expect.objectContaining({ when: expect.any(Number) }),
    );
    expect(api.clear).not.toHaveBeenCalled();
  });
});

describe('ensureAlarms — matching no-op', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9, 6, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call create or clear when existing alarms match desired', async () => {
    const desired = await computeDesired();
    const api = makeAlarmsMock(desired.map((d) => ({ name: d.name, scheduledTime: d.when })));

    await ensureAlarms(api);

    expect(api.create).not.toHaveBeenCalled();
    expect(api.clear).not.toHaveBeenCalled();
  });
});

describe('ensureAlarms — time differs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9, 6, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears and re-creates the alarm when scheduledTime drifts more than tolerance', async () => {
    const desired = await computeDesired();
    const morning = desired.find((d) => d.name === 'morning-brief')!;
    const eod = desired.find((d) => d.name === 'eod-reflection')!;
    // morning is off by 5 minutes (>60s tolerance)
    const api = makeAlarmsMock([
      { name: 'morning-brief', scheduledTime: morning.when + 5 * 60_000 },
      { name: 'eod-reflection', scheduledTime: eod.when },
    ]);

    await ensureAlarms(api);

    expect(api.clear).toHaveBeenCalledWith('morning-brief');
    expect(api.create).toHaveBeenCalledWith('morning-brief', { when: morning.when });
    // eod-reflection within tolerance — must NOT be touched
    expect(api.clear).not.toHaveBeenCalledWith('eod-reflection');
    expect(api.create).not.toHaveBeenCalledWith('eod-reflection', expect.anything());
  });

  it('leaves alarms alone when scheduledTime is within tolerance (≤60s)', async () => {
    const desired = await computeDesired();
    const morning = desired.find((d) => d.name === 'morning-brief')!;
    const eod = desired.find((d) => d.name === 'eod-reflection')!;
    const api = makeAlarmsMock([
      { name: 'morning-brief', scheduledTime: morning.when + 30_000 }, // 30s drift
      { name: 'eod-reflection', scheduledTime: eod.when },
    ]);

    await ensureAlarms(api);

    expect(api.create).not.toHaveBeenCalled();
    expect(api.clear).not.toHaveBeenCalled();
  });
});

describe('ensureAlarms — extras cleared', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9, 6, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears alarms not in the desired set (e.g., stale alarms from a prior version)', async () => {
    const desired = await computeDesired();
    const api = makeAlarmsMock([
      ...desired.map((d) => ({ name: d.name, scheduledTime: d.when })),
      { name: 'legacy-alarm-from-v0', scheduledTime: Date.now() + 86_400_000 },
    ]);

    await ensureAlarms(api);

    expect(api.clear).toHaveBeenCalledWith('legacy-alarm-from-v0');
    expect(api.clear).toHaveBeenCalledTimes(1);
    expect(api.create).not.toHaveBeenCalled();
  });
});

describe('ensureAlarms — idempotent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9, 6, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces no churn when called twice in a row', async () => {
    const api = makeAlarmsMock([]);

    await ensureAlarms(api);
    const createCallsAfterFirst = api.create.mock.calls.length;
    const clearCallsAfterFirst = api.clear.mock.calls.length;

    await ensureAlarms(api);

    expect(api.create.mock.calls.length).toBe(createCallsAfterFirst);
    expect(api.clear.mock.calls.length).toBe(clearCallsAfterFirst);
  });
});
