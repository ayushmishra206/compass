import { describe, it, expect, beforeAll } from 'vitest';
import { createOpenRouterProvider } from '@compass/llm';
import { callWithSchema } from '@compass/llm';
import { PingOutputSchema } from '@compass/core';

const SKIP = !process.env.OPENROUTER_TEST_KEY;

(SKIP ? describe.skip : describe)('gate:wired — real OpenRouter', () => {
  let provider: ReturnType<typeof createOpenRouterProvider>;

  beforeAll(() => {
    provider = createOpenRouterProvider({ apiKey: process.env.OPENROUTER_TEST_KEY! });
  });

  it('real ping returns Zod-valid structured output', async () => {
    const out = await callWithSchema(
      provider,
      {
        taskId: 'system.ping',
        system:
          'You are a connectivity diagnostic. Respond ONLY with the literal JSON object {"pong": true, "echo": "<the user\'s utterance>"}.',
        messages: [{ role: 'user', content: '<utterance>gate-wired-test</utterance>' }],
        maxOutputTokens: 50,
        timeoutMs: 15_000,
        trusted: true,
        schema: PingOutputSchema,
      },
      PingOutputSchema,
    );
    expect(out.pong).toBe(true);
    expect(out.echo).toContain('gate-wired-test');
  }, 30_000);
});
