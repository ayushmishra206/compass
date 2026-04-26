import { z } from 'zod';

export const PingInputSchema = z.object({
  utterance: z.string(),
});
export type PingInput = z.infer<typeof PingInputSchema>;

export const PingOutputSchema = z.object({
  pong: z.literal(true),
  echo: z.string(),
});
export type PingOutput = z.infer<typeof PingOutputSchema>;
