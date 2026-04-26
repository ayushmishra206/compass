import { describe, it, expect } from 'vitest';
import { MilestoneSchema } from './milestone';

describe('Milestone schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = MilestoneSchema.safeParse({
      id: 'm1',
      title: 'MVP complete',
      targetDate: '2026-02-01',
      weekIndex: 2,
      definitionOfDone: 'All core features shipped',
      linkedTaskIds: [],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(MilestoneSchema.safeParse({ id: 'm1' }).success).toBe(false);
  });
});
