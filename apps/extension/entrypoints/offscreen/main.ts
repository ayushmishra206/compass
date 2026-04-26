import { createHandlerRegistry, installRequestListener } from '@compass/runtime';
import { startDb } from '@compass/db';
import { recordCall } from '@compass/llm/ledger';

void startDb();

const registry = createHandlerRegistry();

registry.register('system.ping', async ({ utterance }) => {
  await recordCall({
    ts: new Date().toISOString(),
    feature: 'system.ping',
    provider: 'openrouter',
    model: 'synthetic-stub',
    promptTok: 0,
    cachedTok: 0,
    completionTok: 0,
    usdEstimated: 0,
  });
  return { pong: true as const, echo: utterance };
});

installRequestListener(registry);

console.log('Compass offscreen mounted; handlers registered.');
