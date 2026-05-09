import { describe, it, expect, beforeAll } from 'vitest';
import {
  callWithSchema,
  createAnthropicProvider,
  createOpenAiProvider,
  createOpenRouterProvider,
  type LlmProvider,
} from '@compass/llm';
import { PingOutputSchema } from '@compass/core';

interface ProviderCase {
  name: string;
  envVar: string;
  build: (apiKey: string) => LlmProvider;
  model: string;
}

const cases: ProviderCase[] = [
  {
    name: 'OpenRouter',
    envVar: 'OPENROUTER_TEST_KEY',
    build: (apiKey) => createOpenRouterProvider({ apiKey }),
    model: 'anthropic/claude-haiku-4-5',
  },
  {
    name: 'OpenAI',
    envVar: 'OPENAI_TEST_KEY',
    build: (apiKey) => createOpenAiProvider({ apiKey }),
    model: 'gpt-4o-mini',
  },
  {
    name: 'Anthropic',
    envVar: 'ANTHROPIC_TEST_KEY',
    build: (apiKey) => createAnthropicProvider({ apiKey }),
    model: 'claude-haiku-4-5',
  },
];

for (const c of cases) {
  const SKIP = !process.env[c.envVar];
  (SKIP ? describe.skip : describe)(`gate:wired — real ${c.name}`, () => {
    let provider: LlmProvider;

    beforeAll(() => {
      provider = c.build(process.env[c.envVar]!);
    });

    it(`real ping returns Zod-valid structured output via ${c.name}`, async () => {
      const out = await callWithSchema(
        provider,
        {
          taskId: 'system.ping',
          model: c.model,
          system:
            'You are a connectivity diagnostic. Respond ONLY with the literal JSON object {"pong": true, "echo": "<the user\'s utterance>"}.',
          messages: [
            { role: 'user', content: `<utterance>gate-wired-${c.name.toLowerCase()}</utterance>` },
          ],
          maxOutputTokens: 50,
          timeoutMs: 15_000,
          trusted: true,
          schema: PingOutputSchema,
        },
        PingOutputSchema,
      );
      expect(out.pong).toBe(true);
      expect(out.echo).toContain(`gate-wired-${c.name.toLowerCase()}`);
    }, 30_000);
  });
}
