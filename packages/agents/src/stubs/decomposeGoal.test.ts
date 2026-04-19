import { describe, expect, it } from 'vitest';
import { GOALS } from '@compass/core/fixtures';
import { decomposeGoal } from './decomposeGoal.js';

describe('decomposeGoal stub', () => {
  it('returns a full GoalDecomposition', async () => {
    const d = await decomposeGoal(GOALS[0]!);
    expect(d.milestones.length).toBeGreaterThanOrEqual(4);
    expect(d.firstWeekFocus).toBeTruthy();
    expect(d.risks.length).toBeGreaterThan(0);
  });
});
