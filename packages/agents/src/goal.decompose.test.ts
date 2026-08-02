import { describe, expect, it, vi } from 'vitest';
import { decomposeGoal, weeksBetween } from './goal.decompose';
import type { LlmRouter } from './brief.morning.js';
import { GoalDecomposeOutputSchema } from '@compass/core';

const GOAL = {
  title: 'Ship the alpha',
  why: 'It has been half-built for months.',
  horizon: 'quarter',
  startDate: '2026-07-01',
  endDate: '2026-09-30',
};

const output = (over: Record<string, unknown> = {}) => ({
  milestones: [
    { weekIndex: 1, title: 'Calendar lands', definitionOfDone: 'Merged to master.' },
    { weekIndex: 2, title: 'Goals land', definitionOfDone: 'Merged to master.' },
  ],
  dailyTemplates: ['One 90-minute block'],
  risks: ['Scope creep'],
  firstWeekFocus: 'Pick the smallest shippable slice.',
  ...over,
});

type TaskReq = Parameters<LlmRouter['executeTask']>[0];

function routerReturning(parsed: unknown) {
  return {
    executeTask: vi.fn(async (_req: TaskReq) => ({
      parsed,
      text: '',
      usage: { promptTok: 10, cachedTok: 0, completionTok: 20 },
      model: 'test-model',
      finishReason: 'stop',
    })),
  };
}

describe('weeksBetween', () => {
  it('counts whole weeks', () => {
    expect(weeksBetween('2026-07-01', '2026-07-29')).toBe(4);
  });

  it('never returns zero for a same-day range', () => {
    expect(weeksBetween('2026-07-01', '2026-07-01')).toBe(1);
  });

  it('never returns a negative span for reversed dates', () => {
    expect(weeksBetween('2026-09-30', '2026-07-01')).toBe(1);
  });

  it('falls back to 1 for unparseable input', () => {
    expect(weeksBetween('not-a-date', 'also-not')).toBe(1);
  });
});

describe('decomposeGoal', () => {
  it('returns the parsed plan', async () => {
    const router = routerReturning(output());
    const res = await decomposeGoal({ router, goal: GOAL, weeks: 12, now: () => new Date() });
    expect(res.milestones).toHaveLength(2);
    expect(res.firstWeekFocus).toBe('Pick the smallest shippable slice.');
  });

  it('routes to the goal.decompose task', async () => {
    const router = routerReturning(output());
    await decomposeGoal({ router, goal: GOAL, weeks: 12, now: () => new Date() });
    expect(router.executeTask.mock.calls[0]![0].taskId).toBe('goal.decompose');
  });

  it('tells the model how many weeks it has', async () => {
    const router = routerReturning(output());
    await decomposeGoal({ router, goal: GOAL, weeks: 7, now: () => new Date() });
    const msg = router.executeTask.mock.calls[0]![0].messages[0]!.content;
    expect(msg).toContain('weeks_available>7<');
    expect(msg).toContain('at most 7 milestones');
  });

  it('marks the call trusted — the goal is the user’s own text', async () => {
    const router = routerReturning(output());
    await decomposeGoal({ router, goal: GOAL, weeks: 12, now: () => new Date() });
    expect(router.executeTask.mock.calls[0]![0].trusted).toBe(true);
  });

  it('sorts milestones by week even when the model does not', async () => {
    const router = routerReturning(
      output({
        milestones: [
          { weekIndex: 5, title: 'Late', definitionOfDone: 'x' },
          { weekIndex: 1, title: 'Early', definitionOfDone: 'x' },
        ],
      }),
    );
    const res = await decomposeGoal({ router, goal: GOAL, weeks: 12, now: () => new Date() });
    expect(res.milestones.map((m) => m.title)).toEqual(['Early', 'Late']);
  });

  it('drops milestones scheduled past the goal horizon', async () => {
    const router = routerReturning(
      output({
        milestones: [
          { weekIndex: 1, title: 'Inside', definitionOfDone: 'x' },
          { weekIndex: 40, title: 'Beyond the end date', definitionOfDone: 'x' },
        ],
      }),
    );
    const res = await decomposeGoal({ router, goal: GOAL, weeks: 12, now: () => new Date() });
    expect(res.milestones.map((m) => m.title)).toEqual(['Inside']);
  });

  it('keeps one milestone rather than returning an empty plan', async () => {
    const router = routerReturning(
      output({ milestones: [{ weekIndex: 40, title: 'Way out', definitionOfDone: 'x' }] }),
    );
    const res = await decomposeGoal({ router, goal: GOAL, weeks: 4, now: () => new Date() });
    expect(res.milestones).toHaveLength(1);
  });

  it('rejects a response that fails the schema', async () => {
    const router = routerReturning({ milestones: [], dailyTemplates: [], risks: [] });
    await expect(
      decomposeGoal({ router, goal: GOAL, weeks: 12, now: () => new Date() }),
    ).rejects.toThrow();
  });

  it('tolerates a goal with no why', async () => {
    const router = routerReturning(output());
    await decomposeGoal({
      router,
      goal: { ...GOAL, why: null },
      weeks: 12,
      now: () => new Date(),
    });
    expect(router.executeTask.mock.calls[0]![0].messages[0]!.content).toContain('<why></why>');
  });
});

describe('GoalDecomposeOutputSchema', () => {
  it('requires at least one milestone', () => {
    expect(GoalDecomposeOutputSchema.safeParse(output({ milestones: [] })).success).toBe(false);
  });

  it('rejects a week index outside a year', () => {
    const bad = output({
      milestones: [{ weekIndex: 99, title: 'x', definitionOfDone: 'y' }],
    });
    expect(GoalDecomposeOutputSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a plan with no risks — padding is worse than silence', () => {
    expect(GoalDecomposeOutputSchema.safeParse(output({ risks: [] })).success).toBe(true);
  });
});
