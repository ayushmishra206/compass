import {
  getAccessToken,
  getOAuthGrant,
  setAccessToken,
  clearOAuthGrant,
  OAuthGrantLocked,
} from '@compass/core';
import {
  GmailError,
  getMessage,
  googleInboxProvider,
  listMessageIds,
  OAuthRefreshRevoked,
  refreshAccessToken,
} from '@compass/integrations';
import { extractGmailActions, type LlmRouter } from '@compass/agents';
import type { GmailRepo } from '@compass/db';

/**
 * Inbox sync: fetch recent mail, index it, extract commitments.
 *
 * Message bodies are held in a local variable for the duration of one
 * extraction and never written anywhere. Only the Gmail-provided snippet
 * (capped at 500 chars by the repository) is persisted, per §12.8.
 */

export type InboxSyncOutcome =
  | { ok: true; fetched: number; extracted: number; failed: number }
  | { ok: false; reason: 'not-connected' | 'locked' | 'auth-expired' | 'error'; error?: string };

export interface InboxSyncDeps {
  repo: GmailRepo;
  router: LlmRouter;
  clientId?: string;
  max?: number;
  now?: () => Date;
  fetchImpl?: typeof fetch;
}

const DEFAULT_MAX = 15;

async function ensureAccessToken(deps: InboxSyncDeps): Promise<string | null> {
  const now = deps.now ?? (() => new Date());
  const cached = await getAccessToken('google', now());
  if (cached) return cached;

  const grant = await getOAuthGrant('google');
  if (!grant?.refreshToken || !deps.clientId) return null;

  try {
    const tokens = await refreshAccessToken(googleInboxProvider(deps.clientId), {
      refreshToken: grant.refreshToken,
      fetchImpl: deps.fetchImpl,
      now,
    });
    await setAccessToken('google', tokens.accessToken, tokens.expiresAt);
    return tokens.accessToken;
  } catch (err) {
    if (err instanceof OAuthRefreshRevoked) {
      await clearOAuthGrant('google');
      return null;
    }
    throw err;
  }
}

export async function syncInbox(deps: InboxSyncDeps): Promise<InboxSyncOutcome> {
  const now = deps.now ?? (() => new Date());

  let grant;
  try {
    grant = await getOAuthGrant('google');
  } catch (err) {
    if (err instanceof OAuthGrantLocked) return { ok: false, reason: 'locked' };
    throw err;
  }
  if (!grant) return { ok: false, reason: 'not-connected' };

  // Gmail was granted separately from calendar; a calendar-only grant must not
  // be mistaken for inbox access.
  if (!grant.scope.includes('gmail.readonly')) {
    return { ok: false, reason: 'not-connected' };
  }

  let accessToken: string | null;
  try {
    accessToken = await ensureAccessToken(deps);
  } catch (err) {
    return { ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) };
  }
  if (!accessToken) return { ok: false, reason: 'auth-expired' };

  let ids: string[];
  try {
    ids = await listMessageIds({
      accessToken,
      maxResults: deps.max ?? DEFAULT_MAX,
      fetchImpl: deps.fetchImpl,
    });
  } catch (err) {
    if (err instanceof GmailError && err.kind === 'unauthorized') {
      return { ok: false, reason: 'auth-expired' };
    }
    return { ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) };
  }

  let fetched = 0;
  let extracted = 0;
  let failed = 0;

  for (const id of ids) {
    try {
      const msg = await getMessage({ accessToken, messageId: id, fetchImpl: deps.fetchImpl });

      await deps.repo.upsert([
        {
          messageId: msg.messageId,
          threadId: msg.threadId,
          fromEmail: msg.fromEmail,
          fromName: msg.fromName,
          subject: msg.subject,
          snippet: msg.snippet,
          receivedAt: msg.receivedAt,
        },
      ]);
      fetched++;

      const existing = await deps.repo.get(id);
      if (existing?.lastProcessedAt) continue;

      // msg.body lives only for this call. It is passed to the extractor and
      // then goes out of scope; nothing writes it.
      const result = await extractGmailActions({
        router: deps.router,
        message: {
          id: msg.messageId,
          subject: msg.subject,
          fromEmail: msg.fromEmail,
          body: msg.body,
        },
      });

      await deps.repo.saveExtraction(msg.messageId, {
        priority: result.output.priority,
        actions: result.output.actions.map((a) => ({
          title: a.title,
          owner: a.owner,
          dueDate: a.dueDate ?? null,
          commitmentType: a.commitmentType,
          confidence: a.confidence,
        })),
        injectionFlags: result.injectionFlags,
        processedAt: now().toISOString(),
      });
      extracted++;
    } catch {
      // One malformed or hostile message must not stop the sweep. The error is
      // deliberately not logged — it could contain body text.
      failed++;
    }
  }

  return { ok: true, fetched, extracted, failed };
}
