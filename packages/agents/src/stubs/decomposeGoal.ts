import type { Goal, GoalDecomposition } from '@compass/core';
import { delay } from './_util.js';

/**
 * Stub: returns a canned four-milestone continuation after 1.8 s. The shape
 * mirrors the prototype's `DecomposeModal` result.
 */
export async function decomposeGoal(_goal: Goal): Promise<GoalDecomposition> {
  await delay(1800);
  return {
    generatedAt: new Date().toISOString(),
    milestones: [
      {
        week: 5,
        title: 'Adaptive personalization signals live behind flag',
        done: false,
        definitionOfDone: 'Signals pipeline ships behind feature flag with dashboards.',
      },
      {
        week: 6,
        title: 'Smarter blocker negotiation GA for Plus',
        done: false,
        definitionOfDone: 'Negotiation overlay live for all Plus users.',
      },
      {
        week: 7,
        title: 'Gmail + Meeting AI in staging with 20 internal testers',
        done: false,
        definitionOfDone: 'Internal cohort using extraction + prep every day.',
      },
      {
        week: 8,
        title: 'Closed beta invite — 200 users, 14-day window',
        done: false,
        definitionOfDone: 'Invitation emails sent; feedback form open.',
      },
    ],
    dailyTemplates: [
      'One 90-min implementation block',
      'One 45-min review block',
      'End-of-day telemetry check',
    ],
    risks: [
      'CASA Tier-2 review slides past scope window',
      'Gmail red-team corpus uncovers a blocker in week 7',
    ],
    firstWeekFocus: 'Lock down adaptive-signals metric definitions before any plumbing.',
  };
}
