import { z } from 'zod';
import { LlmCredentialsSchema } from './credentials';

export const ConfigurationSchema = z.object({
  llmCredentials: LlmCredentialsSchema.optional(),
});
export type Configuration = z.infer<typeof ConfigurationSchema>;
