import { describe, it, expect } from 'vitest';
import { GoalSchema } from './goal';

describe('Goal schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = GoalSchema.safeParse({
      id: 'g1',
      createdAt: '2026-01-01T00:00:00Z',
      horizon: 'quarter',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      title: 'Build Compass v1',
      status: 'active',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(GoalSchema.safeParse({ id: 'g1' }).success).toBe(false);
  });
});
