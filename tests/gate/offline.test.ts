import { describe, it, expect, beforeAll } from 'vitest';
import { createInProcessRuntime } from '@compass/runtime/in-process';
import { PingOutputSchema } from '@compass/core';

let runtime: ReturnType<typeof createInProcessRuntime>;

beforeAll(async () => {
  runtime = createInProcessRuntime();
  runtime.registry.register('system.ping', async ({ utterance }) => ({
    pong: true as const,
    echo: utterance,
  }));
  await runtime.init();
});

describe('gate:offline', () => {
  it('synthetic ping returns Zod-valid structured output', async () => {
    const out = await runtime.rpc('system.ping', { utterance: 'gate-test' });
    const parsed = PingOutputSchema.safeParse(out);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.echo).toBe('gate-test');
    }
  });
});
