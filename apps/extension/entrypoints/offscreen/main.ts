import { createHandlerRegistry, installRequestListener } from '@compass/runtime';

const registry = createHandlerRegistry();

// Synthetic ping for week 1; replaced with real LLM call in week 3.
registry.register('system.ping', async ({ utterance }) => ({
  pong: true as const,
  echo: utterance,
}));

installRequestListener(registry);

console.log('Compass offscreen mounted; handlers registered.');
