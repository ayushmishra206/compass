import { createHandlerRegistry, installRequestListener } from '@compass/runtime';
import { startDb } from '@compass/db';
import { getActiveCredentials, PingOutputSchema } from '@compass/core';
import { createOpenRouterProvider } from '@compass/llm';
import { callWithSchema } from '@compass/llm';

void startDb();

const registry = createHandlerRegistry();

registry.register('system.ping', async ({ utterance }) => {
  const creds = await getActiveCredentials();
  if (!creds.openrouter) {
    // Fall back to synthetic when no key configured (dev/offline mode).
    return { pong: true as const, echo: utterance };
  }
  const provider = createOpenRouterProvider({ apiKey: creds.openrouter.apiKey });
  const out = await callWithSchema(
    provider,
    {
      taskId: 'system.ping',
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

registry.register('llm.validateKey', async ({ apiKey }) => {
  const provider = createOpenRouterProvider({ apiKey });
  return provider.validateKey(apiKey);
});

installRequestListener(registry);

console.log('Compass offscreen mounted; handlers registered.');
