import { z } from 'zod';

export const ProviderIdSchema = z.enum(['openai', 'anthropic', 'openrouter']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const KeyEntrySchema = z.object({
  apiKey: z.string(),
  addedAt: z.string(),
  lastValidatedAt: z.string().optional(),
});
export type KeyEntry = z.infer<typeof KeyEntrySchema>;

export const LlmCredentialsSchema = z.object({
  default: ProviderIdSchema.nullable(),
  openrouter: KeyEntrySchema.optional(),
  openai: KeyEntrySchema.optional(),
  anthropic: KeyEntrySchema.optional(),
});
export type LlmCredentials = z.infer<typeof LlmCredentialsSchema>;
