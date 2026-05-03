import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { LlmProvider, LlmRequest, LlmResponse, LlmStreamEvent } from '../provider';
import { LlmKeyInvalid, LlmRateLimited, LlmTimeout, LlmUnavailable } from '../errors';

export interface OpenRouterOpts {
  apiKey: string;
  baseURL?: string; // defaults to openrouter.ai/api/v1
  appUrl?: string; // optional X-Title / HTTP-Referer
}

export function createOpenRouterProvider(opts: OpenRouterOpts): LlmProvider {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL ?? 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': opts.appUrl ?? 'https://compassdash.com',
      'X-Title': 'Compass',
    },
    dangerouslyAllowBrowser: true,
  });

  async function complete(req: LlmRequest, model: string): Promise<LlmResponse> {
    const messages = [
      ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
      ...req.messages,
    ];

    const response_format = req.schema
      ? {
          type: 'json_schema' as const,
          json_schema: {
            name: req.taskId.replace(/\./g, '_'),
            strict: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            schema: zodToJsonSchema(req.schema as any),
          },
        }
      : undefined;

    try {
      const resp = await client.chat.completions.create(
        {
          model,
          messages,
          max_tokens: req.maxOutputTokens,
          temperature: req.temperature,
          response_format,
        },
        { timeout: req.timeoutMs },
      );

      const choice = resp.choices[0];
      const text = choice?.message?.content ?? '';
      const parsed = req.schema ? safeJsonParse(text) : undefined;

      return {
        parsed,
        text,
        usage: {
          promptTok: resp.usage?.prompt_tokens ?? 0,
          cachedTok:
            (resp.usage as { prompt_tokens_details?: { cached_tokens?: number } })
              ?.prompt_tokens_details?.cached_tokens ?? 0,
          completionTok: resp.usage?.completion_tokens ?? 0,
        },
        model: resp.model ?? model,
        finishReason: (choice?.finish_reason as LlmResponse['finishReason']) ?? 'stop',
      };
    } catch (err) {
      throw mapHttpError(err);
    }
  }

  return {
    id: 'openrouter',
    async complete(req) {
      // Router decides the model; provider receives it via taskId routing.
      // For Phase 1, callers may pass the model in a special internal field
      // until the router (Task 21) wires it properly.
      const model =
        (req as LlmRequest & { _model?: string })._model ?? 'anthropic/claude-haiku-4-5';
      return complete(req, model);
    },
    // eslint-disable-next-line require-yield
    async *stream(): AsyncIterable<LlmStreamEvent> {
      throw new Error('Streaming RPC deferred until Phase 3');
    },
    async validateKey(apiKey) {
      try {
        const probe = new OpenAI({
          apiKey,
          baseURL: opts.baseURL ?? 'https://openrouter.ai/api/v1',
          dangerouslyAllowBrowser: true,
        });
        await probe.models.list();
        return { valid: true };
      } catch (err) {
        const mapped = mapHttpError(err);
        if (mapped instanceof LlmKeyInvalid) return { valid: false, error: 'Invalid API key' };
        return { valid: false, error: mapped.message };
      }
    },
  };
}

function mapHttpError(err: unknown): Error {
  const e = err as { status?: number; message?: string; code?: string };
  if (e.code === 'ETIMEDOUT' || /timeout/i.test(e.message ?? '')) {
    return new LlmTimeout(0);
  }
  if (e.status === 401 || e.status === 403) {
    return new LlmKeyInvalid('openrouter', e.message);
  }
  if (e.status === 429) {
    return new LlmRateLimited();
  }
  if (e.status && e.status >= 500) {
    return new LlmUnavailable(e.status, e.message);
  }
  return new LlmUnavailable(e.status, e.message);
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
