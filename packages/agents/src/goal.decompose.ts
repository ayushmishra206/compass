import { GoalDecomposeOutputSchema, type GoalDecomposeOutput } from '@compass/core';
import type { LlmRouter } from './brief.morning.js';

export type { GoalDecomposeOutput };

/**
 * Turns a goal into a week-by-week plan. PRD §10.3.
 *
 * This is the one task routed to the high-reasoning tier: it runs rarely, is
 * always user-triggered, and a vague plan is worse than none.
 */

export interface DecomposeGoalDeps {
  router: LlmRouter;
  goal: {
    title: string;
    why?: string | null;
    horizon: string;
    startDate: string;
    endDate: string;
  };
  /** Weeks between start and end, precomputed so the model never does date math. */
  weeks: number;
  now: () => Date;
}

const SYSTEM = `You decompose a personal goal into a week-by-week plan inside Compass, a calm productivity app.

Rules:
- Return only JSON matching the schema.
- Produce at most one milestone per week, and never more weeks than the goal spans.
- Each milestone must be independently verifiable. "Make progress on X" is not a milestone; "X handles Y case, merged" is.
- definitionOfDone states the observable condition that makes the milestone true. No restating the title.
- dailyTemplates are repeatable daily blocks, not tasks. At most 3.
- risks are specific and plausible for this goal. Do not pad to fill the list. Prefer none to generic ones.
- firstWeekFocus is the single thing to do first, and why it comes first.
- Never invent facts about the user, their tools, their team, or their calendar.
- Write plainly. No motivational filler, no exclamation marks, no "you've got this".`;

export function weeksBetween(startDate: string, endDate: string): number {
  const ms = Date.parse(endDate) - Date.parse(startDate);
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.round(ms / (7 * 86_400_000)));
}

export async function decomposeGoal(deps: DecomposeGoalDeps): Promise<GoalDecomposeOutput> {
  const { goal, weeks } = deps;

  const userMessage = [
    `<goal>`,
    `  <title>${goal.title}</title>`,
    `  <why>${goal.why ?? ''}</why>`,
    `  <horizon>${goal.horizon}</horizon>`,
    `  <start>${goal.startDate}</start>`,
    `  <end>${goal.endDate}</end>`,
    `  <weeks_available>${weeks}</weeks_available>`,
    `</goal>`,
    ``,
    `Produce at most ${weeks} milestones, one per week at most, weekIndex from 1 to ${weeks}.`,
  ].join('\n');

  const res = await deps.router.executeTask({
    taskId: 'goal.decompose',
    schema: GoalDecomposeOutputSchema,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
    trusted: true,
  });

  const parsed = GoalDecomposeOutputSchema.parse(res.parsed);

  // The schema cannot express "no later than the goal's own horizon", and a
  // milestone past the end date would render off the end of the timeline.
  const clamped = parsed.milestones
    .filter((m) => m.weekIndex <= weeks)
    .sort((a, b) => a.weekIndex - b.weekIndex);

  return {
    ...parsed,
    // Keep at least the first milestone even if the model ignored the bound
    // entirely — an empty plan is a worse failure than a mistimed one.
    milestones: clamped.length > 0 ? clamped : [parsed.milestones[0]!],
  };
}
