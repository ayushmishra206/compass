import {
  findRoute,
  getActiveCredentials,
  type LlmCredentials,
  type ProviderId,
} from '@compass/core';
import { createOpenRouterProvider } from './providers/openrouter';
import { createOpenAiProvider } from './providers/openai';
import { createAnthropicProvider } from './providers/anthropic';
import type { LlmProvider, LlmRequest, LlmResponse } from './provider';
import {
  LlmKeyInvalid,
  LlmKeyMissing,
  LlmRateLimited,
  LlmSchemaError,
  LlmTimeout,
  LlmUnavailable,
} from './errors';
import { recordCall } from './ledger';

const FAILOVER_ORDER: readonly ProviderId[] = ['openrouter', 'openai', 'anthropic'];

function buildChain(creds: LlmCredentials): ProviderId[] {
  const def = creds.default;
  const order: ProviderId[] = [];
  if (def && hasKey(creds, def)) order.push(def);
  for (const p of FAILOVER_ORDER) {
    if (p !== def && hasKey(creds, p)) order.push(p);
  }
  return order;
}

function hasKey(creds: LlmCredentials, p: ProviderId): boolean {
  if (p === 'openrouter') return !!creds.openrouter;
  if (p === 'openai') return !!creds.openai;
  if (p === 'anthropic') return !!creds.anthropic;
  return false;
}

function isFailoverTrigger(err: unknown): boolean {
  return (
    err instanceof LlmKeyMissing || err instanceof LlmRateLimited || err instanceof LlmUnavailable
  );
}

function isHardFail(err: unknown): boolean {
  return err instanceof LlmKeyInvalid || err instanceof LlmTimeout || err instanceof LlmSchemaError;
}

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
  const chain = buildChain(creds);
  if (chain.length === 0) throw new LlmKeyMissing();

  let lastErr: unknown = null;
  for (const providerId of chain) {
    const model = route.models[providerId];
    if (!model) {
      // No model configured for this provider on this task — skip silently
      continue;
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
    try {
      const provider = await getProviderInstance(providerId, creds);
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
    } catch (err) {
      lastErr = err;
      if (isHardFail(err)) throw err;
      if (isFailoverTrigger(err)) continue;
      // Unexpected error — re-throw
      throw err;
    }
  }
  if (lastErr) throw lastErr;
  throw new LlmUnavailable(undefined, 'No provider available for failover');
}

async function getProviderInstance(id: ProviderId, creds: LlmCredentials): Promise<LlmProvider> {
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

// Cost estimation. Phase 1.5 uses a static table; Phase 2+ refines.
function estimateUsd(
  _provider: ProviderId,
  model: string,
  usage: { promptTok: number; completionTok: number; cachedTok: number },
): number {
  const PRICING: Record<string, { in: number; out: number }> = {
    'anthropic/claude-haiku-4-5': { in: 1.0 / 1_000_000, out: 5.0 / 1_000_000 },
    'claude-haiku-4-5': { in: 1.0 / 1_000_000, out: 5.0 / 1_000_000 },
    'gpt-4o-mini': { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  };
  const p = PRICING[model] ?? { in: 0, out: 0 };
  return usage.promptTok * p.in + usage.completionTok * p.out;
}
