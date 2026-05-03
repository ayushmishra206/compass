import { findRoute, getActiveCredentials, type ProviderId } from '@compass/core';
import { createOpenRouterProvider } from './providers/openrouter';
import { createOpenAiProvider } from './providers/openai';
import { createAnthropicProvider } from './providers/anthropic';
import type { LlmProvider, LlmRequest, LlmResponse } from './provider';
import { LlmKeyMissing, LlmUnavailable } from './errors';
import { recordCall } from './ledger';

export async function executeTask(
  taskId: string,
  payload: {
    system?: string;
    messages: LlmRequest['messages'];
    schema?: LlmRequest['schema'];
  },
  opts: { trusted: boolean; timeoutMs?: number } = { trusted: true },
): Promise<LlmResponse> {
  const route = findRoute(taskId);
  if (!route) throw new Error(`Unknown taskId: ${taskId}`);

  const creds = await getActiveCredentials();
  const providerId: ProviderId = creds.default ?? 'openrouter';
  const provider = await getProviderInstance(providerId, creds);
  const model = route.models[providerId];
  if (!model) {
    throw new LlmUnavailable(undefined, `No model configured for ${providerId} on ${taskId}`);
  }

  const req: LlmRequest = {
    taskId,
    model,
    system: payload.system,
    messages: payload.messages,
    schema: payload.schema,
    maxOutputTokens: route.maxOutputTokens,
    temperature: route.temperature,
    reasoningEffort: route.reasoningEffort,
    cacheable: route.cacheable,
    timeoutMs: opts.timeoutMs ?? 30_000,
    trusted: opts.trusted,
  };

  const resp = await provider.complete(req);
  await recordCall({
    ts: new Date().toISOString(),
    feature: taskId,
    provider: providerId,
    model: resp.model,
    promptTok: resp.usage.promptTok,
    cachedTok: resp.usage.cachedTok,
    completionTok: resp.usage.completionTok,
    usdEstimated: estimateUsd(providerId, model, resp.usage),
  });
  return resp;
}

async function getProviderInstance(
  id: ProviderId,
  creds: Awaited<ReturnType<typeof getActiveCredentials>>,
): Promise<LlmProvider> {
  if (id === 'openrouter') {
    const entry = creds.openrouter;
    if (!entry) throw new LlmKeyMissing();
    return createOpenRouterProvider({ apiKey: entry.apiKey });
  }
  if (id === 'openai') {
    const entry = creds.openai;
    if (!entry) throw new LlmKeyMissing();
    return createOpenAiProvider({ apiKey: entry.apiKey });
  }
  if (id === 'anthropic') {
    const entry = creds.anthropic;
    if (!entry) throw new LlmKeyMissing();
    return createAnthropicProvider({ apiKey: entry.apiKey });
  }
  throw new LlmUnavailable(undefined, `Unknown provider: ${String(id)}`);
}

// Cost estimation. Phase 1 uses a tiny static table; Phase 2+ refines.
function estimateUsd(
  _provider: ProviderId,
  model: string,
  usage: { promptTok: number; completionTok: number; cachedTok: number },
): number {
  const PRICING: Record<string, { in: number; out: number }> = {
    'anthropic/claude-haiku-4-5': { in: 1.0 / 1_000_000, out: 5.0 / 1_000_000 },
  };
  const p = PRICING[model] ?? { in: 0, out: 0 };
  return usage.promptTok * p.in + usage.completionTok * p.out;
}
