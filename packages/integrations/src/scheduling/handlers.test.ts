import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the runtime barrel BEFORE importing the SUT so the handler picks up the mocks.
vi.mock('@compass/runtime', () => ({
  rpc: vi.fn(async () => ({ pong: true, echo: 'mock' })),
  withHeavyDocAlive: vi.fn(async (work: () => Promise<unknown>) => work()),
}));

import { rpc, withHeavyDocAlive } from '@compass/runtime';
import { registerAlarmHandlers, type AlarmEvents } from './handlers';

interface MockAlarmEvents extends AlarmEvents {
  addListener: ReturnType<typeof vi.fn>;
  fire: (alarm: { name: string }) => void;
}

function makeAlarmEventsMock(): MockAlarmEvents {
  let listener: ((alarm: { name: string }) => void) | null = null;
  const addListener = vi.fn((l: (alarm: { name: string }) => void) => {
    listener = l;
  });
  return {
    addListener,
    fire: (alarm) => {
      if (!listener) throw new Error('No listener registered');
      listener(alarm);
    },
  };
}

describe('registerAlarmHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a single onAlarm listener', () => {
    const events = makeAlarmEventsMock();
    registerAlarmHandlers(events);
    expect(events.addListener).toHaveBeenCalledTimes(1);
  });

  it('morning-brief alarm dispatches rpc("brief.morning", { trigger: "alarm" }) inside withHeavyDocAlive', async () => {
    const events = makeAlarmEventsMock();
    registerAlarmHandlers(events);

    events.fire({ name: 'morning-brief' });
    // Allow the awaited microtasks chained by the listener to settle.
    await new Promise((r) => setTimeout(r, 0));

    expect(withHeavyDocAlive).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('brief.morning', { trigger: 'alarm' });
  });

  it('eod-reflection alarm dispatches rpc("brief.eod", { trigger: "alarm" })', async () => {
    const events = makeAlarmEventsMock();
    registerAlarmHandlers(events);

    events.fire({ name: 'eod-reflection' });
    await new Promise((r) => setTimeout(r, 0));

    expect(withHeavyDocAlive).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('brief.eod', { trigger: 'alarm' });
  });

  it('unknown alarm name is dropped silently — no rpc call', async () => {
    const events = makeAlarmEventsMock();
    registerAlarmHandlers(events);

    events.fire({ name: 'legacy-alarm-from-v0' });
    await new Promise((r) => setTimeout(r, 0));

    expect(withHeavyDocAlive).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
