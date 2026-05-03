// Phase 1 routes registry. Adding a new route: add an entry here, register the
// handler in offscreen, call rpc() from the SW or UI.
//
// Streaming variants are deferred — see Q3(d) in the Phase 1 spec.

import type { ProviderId } from '@compass/core';

export interface Routes {
  'system.ping': {
    req: { utterance: string };
    res: { pong: true; echo: string };
  };
  'llm.complete': {
    req: LlmCompleteRequest;
    res: LlmCompleteResponse;
  };
  'llm.validateKey': {
    req: { provider: ProviderId; apiKey: string };
    res: { valid: boolean; error?: string };
  };
  'ledger.getMonthlySpend': {
    req: { monthStartIso: string };
    res: { usd: number; calls: number };
  };
}

export type RouteKind = keyof Routes;

// Re-exported from @compass/core to keep the registry self-contained at type
// level; the actual runtime objects come from @compass/llm.
export interface LlmCompleteRequest {
  taskId: string;
  system?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  schema?: unknown; // serialized JSON schema or undefined
  maxOutputTokens: number;
  temperature?: number;
  timeoutMs: number;
  trusted: boolean;
}

export interface LlmCompleteResponse {
  parsed?: unknown; // present iff request had schema
  text: string;
  usage: {
    promptTok: number;
    cachedTok: number;
    completionTok: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}
