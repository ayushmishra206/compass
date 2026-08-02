import { describe, expect, it } from 'vitest';
import { goalProgress, weeksRemaining } from './useGoals';
import type { StoredGoal } from '@compass/db';

const goal = (over: Partial<StoredGoal> = {}): StoredGoal => ({
  id: 'g1',
  createdAt: '2026-07-01T00:00:00.000Z',
  horizon: 'quarter',
  startDate: '2026-07-01',
  endDate: '2026-09-30',
  title: 'Ship the alpha',
  why: null,
  status: 'active',
  decomposedAt: null,
  modelId: null,
  dailyTemplates: [],
  risks: [],
  firstWeekFocus: null,
  milestones: [],
  ...over,
});

const milestone = (id: string, done: boolean) => ({
  id,
  goalId: 'g1',
  weekIndex: 1,
  title: id,
  targetDate: null,
  definitionOfDone: '',
  done,
  completedAt: null,
});

describe('goalProgress', () => {
  it('is zero for a goal with no plan yet', () => {
    expect(goalProgress(goal())).toBe(0);
  });

  it('is the fraction of milestones completed', () => {
    const g = goal({
      milestones: [milestone('a', true), milestone('b', false), milestone('c', false)],
    });
    expect(goalProgress(g)).toBeCloseTo(1 / 3);
  });

  it('is 1 when every milestone is done', () => {
    expect(goalProgress(goal({ milestones: [milestone('a', true)] }))).toBe(1);
  });
});

describe('weeksRemaining', () => {
  it('counts whole weeks to the end date', () => {
    expect(weeksRemaining(goal({ endDate: '2026-08-30' }), new Date('2026-08-02'))).toBe(4);
  });

  it('never goes negative for a goal past its date', () => {
    expect(weeksRemaining(goal({ endDate: '2026-01-01' }), new Date('2026-08-02'))).toBe(0);
  });

  it('returns 0 for an unparseable end date', () => {
    expect(weeksRemaining(goal({ endDate: 'nonsense' }), new Date('2026-08-02'))).toBe(0);
  });
});
