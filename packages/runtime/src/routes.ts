// Phase 1 routes registry. Adding a new route: add an entry here, register the
// handler in offscreen, call rpc() from the SW or UI.
//
// Streaming variants are deferred — see Q3(d) in the Phase 1 spec.

import type { StoredBriefing } from '@compass/db';
import type { ProviderId, SceneManifest, WxAffinity } from '@compass/core';

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
  'scenes.getManifest': {
    req: { etag?: string };
    res: { manifest: SceneManifest; fetchedAt: number };
  };
  'scenes.fetchPhoto': {
    req: { url: string; sha256: string };
    res: { blobUrl: string };
  };
  'weather.getCurrent': {
    req: { lat: number; lon: number };
    res: {
      code: number;
      tempC: number;
      summary: string;
      affinity: WxAffinity;
      fetchedAt: number;
    };
  };
  'brief.morning': {
    req: { trigger: 'alarm' | 'manual' | 'catchup'; force?: boolean };
    res: { stored: StoredBriefing } | { skipped: 'locked' | 'too-early' };
  };
  'brief.eod': {
    req: { trigger: 'alarm' | 'manual'; force?: boolean };
    res: { stored: StoredBriefing } | { skipped: 'locked' | 'no-morning-brief' };
  };
  'brief.getOrGenerate': {
    req: { kind: 'morning' | 'eod' };
    res:
      | { kind: 'have-brief'; brief: StoredBriefing }
      | { kind: 'locked-no-brief' }
      | { kind: 'too-early'; readyAt: string }
      | { kind: 'generating' };
  };
  'brief.recordOpen': { req: { dateLocal: string; kind: 'morning' | 'eod' }; res: { ok: true } };
  'brief.recordRating': {
    req: { dateLocal: string; kind: 'morning' | 'eod'; rating: -1 | 1 };
    res: { ok: true };
  };
  'brief.streak': { req: Record<string, never>; res: { days: number; lastDate: string | null } };
  'pomodoro.start': { req: { id: string; durationMin: number; theme?: string }; res: { ok: true } };
  'pomodoro.complete': { req: { id: string }; res: { ok: true } };
  'pomodoro.abandon': { req: { id: string }; res: { ok: true } };
  'alarms.refresh': { req: Record<string, never>; res: { ok: true } };
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
