import { describe, it, expect } from 'vitest';
import { FocusSessionSchema } from './focus';

describe('FocusSession schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = FocusSessionSchema.safeParse({
      id: 'f1',
      startedAt: '2026-04-26T10:00:00Z',
      focusText: 'Implement schemas',
      interruptionCount: 0,
      device: 'desktop',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(FocusSessionSchema.safeParse({ id: 'f1' }).success).toBe(false);
  });
});
