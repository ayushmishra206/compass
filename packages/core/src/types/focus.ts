import { z } from 'zod';

export const FocusOutcomeSchema = z.enum(['completed', 'partial', 'abandoned']);
export type FocusOutcome = z.infer<typeof FocusOutcomeSchema>;

export const FocusSessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  durationSec: z.number().int().optional(),
  focusText: z.string(),
  goalId: z.string().optional(),
  pomodoroRound: z.number().int().optional(),
  interruptionCount: z.number().int(),
  soundscapeId: z.string().optional(),
  selfRating: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  outcome: FocusOutcomeSchema.optional(),
  device: z.enum(['desktop', 'mobile', 'visionos']),
});
export type FocusSession = z.infer<typeof FocusSessionSchema>;
