import { z } from 'zod';

export const TimeWindowSchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});
export type TimeWindow = z.infer<typeof TimeWindowSchema>;

export const BlockRuleSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  mode: z.enum(['hard', 'soft']),
  source: z.enum(['user', 'adaptive']),
  createdAt: z.string(),
  activeWindows: z.array(TimeWindowSchema).optional(),
  strikes: z.number().int(),
});
export type BlockRule = z.infer<typeof BlockRuleSchema>;

export const BlockEventOutcomeSchema = z.enum([
  'blocked',
  'bypassed_after_chat',
  'bypassed_immediately',
  'dismissed',
]);
export type BlockEventOutcome = z.infer<typeof BlockEventOutcomeSchema>;

export const BlockEventSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  occurredAt: z.string(),
  url: z.string(),
  outcome: BlockEventOutcomeSchema,
  negotiationId: z.string().optional(),
  contextSignal: z.any().optional(), // BlockContextSignal ref, per PRD §11
});
export type BlockEvent = z.infer<typeof BlockEventSchema>;
