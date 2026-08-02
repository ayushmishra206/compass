import { z } from 'zod';

export const GoalStatusSchema = z.enum(['active', 'paused', 'achieved', 'abandoned']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const GoalHorizonSchema = z.enum(['quarter', 'year', 'custom']);
export type GoalHorizon = z.infer<typeof GoalHorizonSchema>;

export const GoalMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  target: z.number(),
  unit: z.string().optional(),
});
export type GoalMetric = z.infer<typeof GoalMetricSchema>;

export const GoalSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  horizon: GoalHorizonSchema,
  startDate: z.string(),
  endDate: z.string(),
  title: z.string(),
  why: z.string().optional(),
  status: GoalStatusSchema,
  decomposition: z.any().optional(), // GoalDecomposition ref, handled separately
  metrics: z.array(GoalMetricSchema).optional(),
});
export type Goal = z.infer<typeof GoalSchema>;

// GoalDecomposition is the structured output of the Phase 4 `goal.decompose`
// task. Phase 1 ships a minimal type so the Phase 0 seam stub for
// `decomposeGoal()` typechecks; Phase 4 will refine the schema with semantic
// validators when the consumer surfaces ship.
export const GoalDecompositionMilestoneSchema = z.object({
  week: z.number().int(),
  title: z.string(),
  done: z.boolean(),
  definitionOfDone: z.string(),
});
export type GoalDecompositionMilestone = z.infer<typeof GoalDecompositionMilestoneSchema>;

/**
 * Structured output of the `goal.decompose` task (PRD §10.3). Distinct from
 * GoalDecomposition below, which is the stored shape — this one is what the
 * model is constrained to produce.
 */
export const GoalDecomposeOutputSchema = z.object({
  milestones: z
    .array(
      z.object({
        weekIndex: z.number().int().min(1).max(52),
        title: z.string().max(100),
        definitionOfDone: z.string().max(200),
      }),
    )
    .min(1)
    .max(16),
  dailyTemplates: z.array(z.string().max(80)).max(4),
  risks: z.array(z.string().max(140)).max(4),
  firstWeekFocus: z.string().max(200),
});
export type GoalDecomposeOutput = z.infer<typeof GoalDecomposeOutputSchema>;

export const GoalDecompositionSchema = z.object({
  generatedAt: z.string(),
  milestones: z.array(GoalDecompositionMilestoneSchema),
  dailyTemplates: z.array(z.string()),
  risks: z.array(z.string()),
  firstWeekFocus: z.string(),
});
export type GoalDecomposition = z.infer<typeof GoalDecompositionSchema>;
