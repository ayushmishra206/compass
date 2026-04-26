import { z } from 'zod';
import { ProviderIdSchema } from './credentials';

export const CostLedgerRowSchema = z.object({
  id: z.string(),
  ts: z.string(), // ISO-8601 UTC
  feature: z.string(), // taskId
  provider: ProviderIdSchema,
  model: z.string(),
  promptTok: z.number().int().nonnegative(),
  cachedTok: z.number().int().nonnegative(),
  completionTok: z.number().int().nonnegative(),
  usdEstimated: z.number().nonnegative(),
});
export type CostLedgerRow = z.infer<typeof CostLedgerRowSchema>;
