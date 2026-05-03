import { createHandlerRegistry, installRequestListener } from '@compass/runtime';
import { startDb } from '@compass/db';
import { getActiveCredentials, PingOutputSchema } from '@compass/core';
import {
  callWithSchema,
  createAnthropicProvider,
  createOpenAiProvider,
  createOpenRouterProvider,
} from '@compass/llm';

void startDb();

const registry = createHandlerRegistry();

registry.register('system.ping', async ({ utterance }) => {
  const creds = await getActiveCredentials();
  if (!creds.openrouter && !creds.openai && !creds.anthropic) {
    // Fall back to synthetic when no key configured (dev/offline mode).
    return { pong: true as const, echo: utterance };
  }
  // For Phase 1.5 ping path we still hit OpenRouter when present (matches existing UX);
  // the multi-provider router is exercised by Phase 2+ tasks via executeTask().
  const orKey = creds.openrouter?.apiKey;
  if (!orKey) {
    return { pong: true as const, echo: utterance };
  }
  const provider = createOpenRouterProvider({ apiKey: orKey });
  const out = await callWithSchema(
    provider,
    {
      taskId: 'system.ping',
      model: 'anthropic/claude-haiku-4-5',
      system:
        'You are a connectivity diagnostic. Respond ONLY with the literal JSON object {"pong": true, "echo": "<the user\'s utterance>"}.',
      messages: [{ role: 'user', content: `<utterance>${utterance}</utterance>` }],
      maxOutputTokens: 50,
      timeoutMs: 15_000,
      trusted: true,
      schema: PingOutputSchema,
    },
    PingOutputSchema,
  );
  return out;
});

registry.register('llm.validateKey', async ({ provider, apiKey }) => {
  if (provider === 'openrouter') {
    return createOpenRouterProvider({ apiKey }).validateKey(apiKey);
  }
  if (provider === 'openai') {
    return createOpenAiProvider({ apiKey }).validateKey(apiKey);
  }
  if (provider === 'anthropic') {
    return createAnthropicProvider({ apiKey }).validateKey(apiKey);
  }
  return { valid: false, error: `Unknown provider: ${String(provider)}` };
});

installRequestListener(registry);

console.log('Compass offscreen mounted; handlers registered.');
