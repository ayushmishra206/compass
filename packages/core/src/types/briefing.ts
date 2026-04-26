import { z } from 'zod';

export const AgentBriefingKindSchema = z.enum(['morning', 'eod']);
export type AgentBriefingKind = z.infer<typeof AgentBriefingKindSchema>;

export const BriefingInputsSchema = z.object({
  now: z.string(),
  timezone: z.string(),
  user: z.object({ name: z.string().optional() }),
  events: z
    .array(
      z.object({
        id: z.string(),
        start: z.string(),
        end: z.string(),
        summary: z.string(),
        attendeeCount: z.number().int(),
        hasConference: z.boolean(),
        isFocusBlock: z.boolean(),
      }),
    )
    .optional(),
  overdueTasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        source: z.string(),
        daysOverdue: z.number(),
      }),
    )
    .optional(),
  focusSummary14d: z
    .object({
      totalFocusMin: z.number(),
      peakHourLocal: z.number().nullable(),
      avgInterruptPerSession: z.number(),
      trend: z.enum(['improving', 'flat', 'declining']),
    })
    .optional(),
  fitbit: z
    .object({
      sleepScore: z.number().nullable(),
      recoveryScore: z.number().nullable(),
      restingHr: z.number().nullable(),
    })
    .nullable()
    .optional(),
  weather: z
    .object({
      summary: z.string(),
      tempC: z.number(),
      precipitationPct: z.number(),
    })
    .nullable()
    .optional(),
  activeGoals: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        weeksRemaining: z.number(),
        currentMilestone: z.string().nullable(),
      }),
    )
    .optional(),
});
export type BriefingInputs = z.infer<typeof BriefingInputsSchema>;

export const BriefingOutputSchema = z.object({
  oneLineMood: z.string(),
  tldr: z.string(),
  topPriority: z.object({
    title: z.string(),
    why: z.string(),
    suggestedFocusMinutes: z.number().int(),
  }),
  pomodoros: z
    .array(
      z.object({
        startLocal: z.string(),
        endLocal: z.string(),
        theme: z.string(),
        taskId: z.string().optional(),
      }),
    )
    .optional(),
  watchouts: z.array(z.string()).optional(),
  recovery: z.object({
    note: z.string(),
    suggestBreak: z.boolean(),
  }),
  quotedGoal: z.string().nullable().optional(),
});
export type BriefingOutput = z.infer<typeof BriefingOutputSchema>;

export const AgentBriefingSchema = z.object({
  id: z.string(),
  kind: AgentBriefingKindSchema,
  generatedAt: z.string(),
  forDate: z.string(),
  modelId: z.string(),
  tokensUsed: z.object({
    prompt: z.number().int(),
    completion: z.number().int(),
    cached: z.number().int(),
  }),
  inputs: BriefingInputsSchema,
  output: BriefingOutputSchema,
  userRating: z.enum(['up', 'down']).nullable().optional(),
  openedAt: z.string().optional(),
});
export type AgentBriefing = z.infer<typeof AgentBriefingSchema>;
