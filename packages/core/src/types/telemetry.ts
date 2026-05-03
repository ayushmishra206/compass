import { z } from 'zod';

export const TelemetryNameSchema = z.enum([
  'brief.generated',
  'brief.opened',
  'brief.rated',
  'note.autolinked',
  'note.search',
  'block.negotiation',
  'block.bypass',
  'gmail.extract',
  'gmail.draft_accepted',
  'goal.created',
  'goal.drift_flag',
  'llm.call',
  'llm.error',
]);
export type TelemetryName = z.infer<typeof TelemetryNameSchema>;

export const TelemetryEventSchema = z.object({
  id: z.string(),
  pseudonymousUserId: z.string(),
  ts: z.string(),
  name: TelemetryNameSchema,
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
