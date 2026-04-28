import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { callWithSchema } from '../src/validate';
import { LlmSchemaError } from '../src/errors';
import type { LlmProvider } from '../src/provider';

const schema = z.object({ pong: z.literal(true), echo: z.string() });

describe('callWithSchema', () => {
  it('returns parsed on first success', async () => {
    const provider: LlmProvider = {
      id: 'openrouter' as const,
      complete: vi.fn().mockResolvedValue({
        parsed: { pong: true, echo: 'hi' },
        text: '',
        usage: { promptTok: 0, cachedTok: 0, completionTok: 0 },
        model: 'm',
        finishReason: 'stop',
      }),
      stream: vi.fn(),
      validateKey: vi.fn(),
    };
    const out = await callWithSchema(
      provider,
      {
        taskId: 'system.ping',
        messages: [],
        maxOutputTokens: 50,
        timeoutMs: 1000,
        trusted: true,
        schema,
      },
      schema,
    );
    expect(out).toEqual({ pong: true, echo: 'hi' });
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it('retries up to 3 times on schema fail then throws LlmSchemaError', async () => {
    const provider: LlmProvider = {
      id: 'openrouter' as const,
      complete: vi.fn().mockResolvedValue({
        parsed: { pong: false },
        text: '{"pong":false}',
        usage: { promptTok: 0, cachedTok: 0, completionTok: 0 },
        model: 'm',
        finishReason: 'stop',
      }),
      stream: vi.fn(),
      validateKey: vi.fn(),
    };
    await expect(
      callWithSchema(
        provider,
        {
          taskId: 'system.ping',
          messages: [],
          maxOutputTokens: 50,
          timeoutMs: 1000,
          trusted: true,
          schema,
        },
        schema,
      ),
    ).rejects.toBeInstanceOf(LlmSchemaError);
    expect(provider.complete).toHaveBeenCalledTimes(3);
  });
});
