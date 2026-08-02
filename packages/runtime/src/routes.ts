// Phase 1 routes registry. Adding a new route: add an entry here, register the
// handler in offscreen, call rpc() from the SW or UI.
//
// Streaming variants are deferred — see Q3(d) in the Phase 1 spec.

import type { StoredBriefing, StoredGoal, StoredBlockRule, StoredMessage } from '@compass/db';
import type { CalendarEventRow, ProviderId, SceneManifest, WxAffinity } from '@compass/core';

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
  'pomodoro.start': {
    req: { id: string; durationMin: number; theme?: string; soundscapeId?: string | null };
    res: { ok: true };
  };
  'pomodoro.complete': { req: { id: string }; res: { ok: true } };
  'pomodoro.abandon': { req: { id: string }; res: { ok: true } };
  'alarms.refresh': { req: Record<string, never>; res: { ok: true } };
  // Calendar. `connect` runs in the service worker because
  // identity.launchWebAuthFlow is unavailable to the offscreen document; the
  // rest run in offscreen alongside the DB.
  'calendar.connect': {
    req: { clientId: string };
    res: { ok: true; email?: string } | { ok: false; error: string };
  };
  'calendar.disconnect': { req: Record<string, never>; res: { ok: true } };
  'calendar.status': {
    req: Record<string, never>;
    res: { connected: boolean; email?: string; lastSyncAt?: string };
  };
  'calendar.sync': {
    req: { force?: boolean };
    res:
      | { ok: true; upserted: number; deleted: number; truncated: boolean }
      | {
          ok: false;
          reason: 'not-connected' | 'locked' | 'auth-expired' | 'error';
          error?: string;
        };
  };
  'calendar.listRange': {
    req: { fromIso: string; toIso: string };
    res: { events: CalendarEventRow[] };
  };
  'goals.list': {
    req: { status?: 'active' | 'paused' | 'achieved' | 'abandoned' };
    res: { goals: StoredGoal[] };
  };
  'goals.create': {
    req: {
      title: string;
      why?: string;
      horizon: 'quarter' | 'year' | 'custom';
      startDate: string;
      endDate: string;
    };
    res: { id: string };
  };
  'goals.update': {
    req: {
      id: string;
      title?: string;
      why?: string;
      status?: 'active' | 'paused' | 'achieved' | 'abandoned';
      endDate?: string;
    };
    res: { ok: true };
  };
  'goals.delete': { req: { id: string }; res: { ok: true } };
  'goals.decompose': {
    req: { id: string };
    res:
      | { ok: true; goal: StoredGoal }
      | { ok: false; reason: 'locked' | 'not-found' | 'error'; error?: string };
  };
  'personalization.signals': {
    req: Record<string, never>;
    res: {
      peakFocusHour: number | null;
      streakDays: number;
      streakLastDate: string | null;
      totalFocusMin: number;
      completedSessions: number;
      burnoutEwma: number;
    };
  };
  'blocker.list': { req: Record<string, never>; res: { rules: StoredBlockRule[] } };
  'blocker.add': {
    req: { pattern: string; mode: 'hard' | 'soft'; focusOnly?: boolean };
    res: { ok: true } | { ok: false; error: string };
  };
  'blocker.setEnabled': { req: { id: string; enabled: boolean }; res: { ok: true } };
  'blocker.remove': { req: { id: string }; res: { ok: true } };
  // Service-worker owned: declarativeNetRequest is unavailable to offscreen.
  'blocker.applyRules': {
    req: { rules: StoredBlockRule[]; focusActive: boolean };
    res: { ok: true; active: number };
  };
  'blocker.grantPass': { req: { hostname: string }; res: { ok: true } };
  'blocker.recordBypass': { req: { ruleId: string; hostname: string }; res: { ok: true } };
  'inbox.connect': {
    req: { clientId: string };
    res: { ok: true; email?: string } | { ok: false; error: string };
  };
  'inbox.status': {
    req: Record<string, never>;
    res: { connected: boolean; lastSyncAt?: string; count: number };
  };
  'inbox.sync': {
    req: { max?: number };
    res:
      | { ok: true; fetched: number; extracted: number; failed: number }
      | {
          ok: false;
          reason: 'not-connected' | 'locked' | 'auth-expired' | 'error';
          error?: string;
        };
  };
  'inbox.list': { req: { limit?: number }; res: { messages: StoredMessage[] } };
  /** §12.8 kill switch: wipes the local index. */
  'inbox.wipe': { req: Record<string, never>; res: { ok: true } };
  'goals.setMilestoneDone': {
    req: { milestoneId: string; done: boolean };
    res: { ok: true };
  };
  'notes.create': {
    req: { title: string; body: string; tags: string[] };
    res: { id: string };
  };
  'notes.update': {
    req: {
      id: string;
      title?: string;
      body?: string;
      tags?: string[];
      autolinkEnabled?: boolean;
    };
    res: {
      ok: true;
      embeddingPending?: boolean;
      forgotten?: { noteId: string; sim: number; title: string };
    };
  };
  'notes.delete': { req: { id: string }; res: { ok: true } };
  'notes.list': {
    req: { limit?: number; offset?: number };
    res: {
      notes: Array<{
        id: string;
        title: string;
        excerpt: string;
        updatedAt: string;
        tags: string[];
      }>;
    };
  };
  'notes.get': {
    req: { id: string };
    res: {
      note: {
        id: string;
        createdAt: string;
        updatedAt: string;
        title: string;
        body: string;
        tags: string[];
        autolinkEnabled: boolean;
      };
      autoLinks: Array<{
        targetNoteId: string;
        targetTitle: string;
        similarity: number;
        rationale: string | null;
      }>;
    };
  };
  'notes.search': {
    req: { query: string; limit?: number };
    res: {
      hits: Array<{ noteId: string; title: string; excerpt: string; score: number }>;
    };
  };
  'notes.askGrounded': {
    req: { query: string };
    res:
      | {
          answer: string;
          citations: Array<{ id: string; noteId: string; title: string }>;
          reason: null;
        }
      | { answer: null; citations: []; reason: 'no-notes' | 'locked' | 'error' };
  };
  'notes.autolink.rationale': {
    req: { srcId: string; targetId: string };
    res: { rationale: string } | { rationale: null; reason: 'locked' | 'error' };
  };
  'notes.autolink.dismiss': {
    req: { srcId: string; targetId: string };
    res: { ok: true };
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
