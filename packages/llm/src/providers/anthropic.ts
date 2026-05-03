import Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { LlmProvider, LlmRequest, LlmResponse, LlmStreamEvent } from '../provider';
import { LlmKeyInvalid, LlmRateLimited, LlmTimeout, LlmUnavailable } from '../errors';

const TOOL_NAME = '__compass_response';

export interface AnthropicOpts {
  apiKey: string;
  baseURL?: string;
}

export function createAnthropicProvider(opts: AnthropicOpts): LlmProvider {
  const client = new Anthropic({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL,
    dangerouslyAllowBrowser: true,
  });

  async function complete(req: LlmRequest): Promise<LlmResponse> {
    const tools = req.schema
      ? [
          {
            name: TOOL_NAME,
            description: 'Return your response in this exact structured format.',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            input_schema: zodToJsonSchema(req.schema as any) as Anthropic.Tool['input_schema'],
          } satisfies Anthropic.Tool,
        ]
      : undefined;

    try {
      const resp = await client.messages.create(
        {
          model: req.model,
          system: req.system,
          messages: req.messages.map((m) => ({
            role: m.role === 'system' ? 'user' : (m.role as 'user' | 'assistant'),
            content: m.content,
          })),
          max_tokens: req.maxOutputTokens,
          temperature: req.temperature,
          tools,
          tool_choice: req.schema ? { type: 'tool', name: TOOL_NAME } : undefined,
        },
        { timeout: req.timeoutMs },
      );

      const toolUse = resp.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === TOOL_NAME,
      );
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const usage = resp.usage as {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
      };

      return {
        parsed: toolUse?.input,
        text,
        usage: {
          promptTok: usage.input_tokens,
          cachedTok: usage.cache_read_input_tokens ?? 0,
          completionTok: usage.output_tokens,
        },
        model: resp.model,
        finishReason: mapStopReason(resp.stop_reason),
      };
    } catch (err) {
      throw mapHttpError(err);
    }
  }

  return {
    id: 'anthropic',
    async complete(req) {
      return complete(req);
    },
    // eslint-disable-next-line require-yield
    async *stream(): AsyncIterable<LlmStreamEvent> {
      throw new Error('Streaming RPC deferred until Phase 3');
    },
    async validateKey(apiKey) {
      try {
        const probe = new Anthropic({
          apiKey,
          baseURL: opts.baseURL,
          dangerouslyAllowBrowser: true,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (probe as any).models.list();
        return { valid: true };
      } catch (err) {
        const mapped = mapHttpError(err);
        if (mapped instanceof LlmKeyInvalid) return { valid: false, error: 'Invalid API key' };
        return { valid: false, error: mapped.message };
      }
    },
  };
}

function mapStopReason(reason: string | null): LlmResponse['finishReason'] {
  if (reason === 'max_tokens') return 'length';
  if (reason === 'end_turn' || reason === 'stop_sequence' || reason === 'tool_use') return 'stop';
  return 'error';
}

function mapHttpError(err: unknown): Error {
  const e = err as { status?: number; message?: string; code?: string };
  if (e.code === 'ETIMEDOUT' || /timeout/i.test(e.message ?? '')) {
    return new LlmTimeout(0);
  }
  if (e.status === 401 || e.status === 403) {
    return new LlmKeyInvalid('anthropic', e.message);
  }
  if (e.status === 429) {
    return new LlmRateLimited();
  }
  if (e.status && e.status >= 500) {
    return new LlmUnavailable(e.status, e.message);
  }
  return new LlmUnavailable(e.status, e.message);
}
