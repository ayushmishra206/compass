import { createHandlerRegistry, installRequestListener } from '@compass/runtime';
import type { Routes } from '@compass/runtime';
import { startDb } from '@compass/db';
import { getActiveCredentials, PingOutputSchema, codeToAffinity } from '@compass/core';
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

const SCENE_MANIFEST_URL = 'https://assets.compassdash.com/scenes/manifest.v1.json';

registry.register('scenes.getManifest', async (req) => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (req.etag) headers['If-None-Match'] = req.etag;

  const res = await fetch(SCENE_MANIFEST_URL, { headers });
  if (!res.ok) {
    throw new Error(`scene manifest fetch failed: ${res.status}`);
  }
  const manifest = (await res.json()) as Routes['scenes.getManifest']['res']['manifest'];
  return { manifest, fetchedAt: Date.now() };
});

registry.register('weather.getCurrent', async (req) => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', req.lat.toFixed(3));
  url.searchParams.set('longitude', req.lon.toFixed(3));
  url.searchParams.set('current', 'weather_code,temperature_2m');

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`open-meteo fetch failed: ${res.status}`);
  const json = (await res.json()) as {
    current: { weather_code: number; temperature_2m: number };
  };

  const code = json.current.weather_code;
  return {
    code,
    tempC: json.current.temperature_2m,
    summary: weatherSummary(code),
    affinity: codeToAffinity(code),
    fetchedAt: Date.now(),
  };
});

function weatherSummary(code: number): string {
  if (code === 0 || code === 1) return 'Clear';
  if (code === 2 || code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Stormy';
  return 'Mixed';
}

installRequestListener(registry);

console.log('Compass offscreen mounted; handlers registered.');
