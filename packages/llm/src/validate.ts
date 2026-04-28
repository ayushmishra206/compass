import type { z } from 'zod';
import type { LlmProvider, LlmRequest } from './provider';
import { LlmSchemaError } from './errors';

export async function callWithSchema<T>(
  provider: LlmProvider,
  req: LlmRequest,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const messages = [...req.messages];
  let lastResponse: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await provider.complete({ ...req, messages, schema });
    lastResponse = resp;
    const parse = schema.safeParse(resp.parsed);
    if (parse.success) return parse.data;
    if (attempt < 2) {
      messages.push({
        role: 'user',
        content: `Your previous response failed validation: ${parse.error.message}. Return JSON matching the schema exactly.`,
      });
    } else {
      throw new LlmSchemaError(parse.error.issues, lastResponse);
    }
  }
  throw new Error('unreachable');
}
