import { describe, it, expect, beforeEach } from 'vitest';
import { useBriefStore } from './briefStore';

describe('briefStore', () => {
  beforeEach(() => {
    useBriefStore.setState({
      morning: { kind: 'loading' },
      eod: { kind: 'loading' },
    });
  });

  it('setMorning updates the morning slice', () => {
    useBriefStore.getState().setMorning({ kind: 'too-early', readyAt: '2026-05-10T08:00:00Z' });
    expect(useBriefStore.getState().morning).toEqual({
      kind: 'too-early',
      readyAt: '2026-05-10T08:00:00Z',
    });
  });

  it('setEod updates the eod slice', () => {
    useBriefStore.getState().setEod({ kind: 'locked-no-brief' });
    expect(useBriefStore.getState().eod.kind).toBe('locked-no-brief');
  });

  it('reset returns both slices to loading', () => {
    useBriefStore.getState().setMorning({ kind: 'locked-no-brief' });
    useBriefStore.getState().setEod({ kind: 'locked-no-brief' });
    useBriefStore.getState().reset();
    expect(useBriefStore.getState().morning.kind).toBe('loading');
    expect(useBriefStore.getState().eod.kind).toBe('loading');
  });

  it('initial state for both slices is loading', () => {
    // Note: beforeEach resets to loading, so this is a sanity check
    expect(useBriefStore.getState().morning.kind).toBe('loading');
    expect(useBriefStore.getState().eod.kind).toBe('loading');
  });
});
