import {
  getAccessToken,
  getOAuthGrant,
  setAccessToken,
  clearOAuthGrant,
  OAuthGrantLocked,
  type CalendarEventRow,
} from '@compass/core';
import {
  GcalError,
  googleCalendarProvider,
  OAuthRefreshRevoked,
  refreshAccessToken,
  syncCalendar,
} from '@compass/integrations';
import type { CalendarRepo } from '@compass/db';
import type { BriefEvent } from '@compass/agents';

/**
 * Calendar sync, offscreen side. Runs here rather than in the service worker
 * because it touches the OPFS-backed database and can outlive an SW lifetime.
 */

export const PRIMARY_CALENDAR = 'primary';

/** How far back and forward a first (or recovery) sync reaches. */
const WINDOW_BACK_DAYS = 1;
const WINDOW_FORWARD_DAYS = 14;

export type SyncOutcome =
  | { ok: true; upserted: number; deleted: number; truncated: boolean }
  | { ok: false; reason: 'not-connected' | 'locked' | 'auth-expired' | 'error'; error?: string };

export interface SyncDeps {
  repo: CalendarRepo;
  clientId?: string;
  now?: () => Date;
  fetchImpl?: typeof fetch;
}

function windowFor(now: Date): { timeMin: string; timeMax: string } {
  return {
    timeMin: new Date(now.getTime() - WINDOW_BACK_DAYS * 86_400_000).toISOString(),
    timeMax: new Date(now.getTime() + WINDOW_FORWARD_DAYS * 86_400_000).toISOString(),
  };
}

/**
 * Returns a usable access token, refreshing if the cached one is missing or
 * about to expire. Returns null when the grant is gone or was revoked.
 */
async function ensureAccessToken(deps: SyncDeps): Promise<string | null> {
  const now = deps.now ?? (() => new Date());

  const cached = await getAccessToken('google', now());
  if (cached) return cached;

  const grant = await getOAuthGrant('google');
  if (!grant?.refreshToken || !deps.clientId) return null;

  try {
    const tokens = await refreshAccessToken(googleCalendarProvider(deps.clientId), {
      refreshToken: grant.refreshToken,
      fetchImpl: deps.fetchImpl,
      now,
    });
    await setAccessToken('google', tokens.accessToken, tokens.expiresAt);
    return tokens.accessToken;
  } catch (err) {
    if (err instanceof OAuthRefreshRevoked) {
      // The user revoked access at Google. Keeping the grant would mean
      // retrying a token that can never work again.
      await clearOAuthGrant('google');
      return null;
    }
    throw err;
  }
}

export async function syncPrimaryCalendar(deps: SyncDeps): Promise<SyncOutcome> {
  const now = deps.now ?? (() => new Date());

  let grant;
  try {
    grant = await getOAuthGrant('google');
  } catch (err) {
    if (err instanceof OAuthGrantLocked) return { ok: false, reason: 'locked' };
    throw err;
  }
  if (!grant) return { ok: false, reason: 'not-connected' };

  let accessToken: string | null;
  try {
    accessToken = await ensureAccessToken(deps);
  } catch (err) {
    return { ok: false, reason: 'error', error: err instanceof Error ? err.message : String(err) };
  }
  if (!accessToken) return { ok: false, reason: 'auth-expired' };

  const selfEmail = grant.email ?? '';
  const storedToken = await deps.repo.getSyncToken(PRIMARY_CALENDAR);

  const run = async (syncToken?: string) =>
    syncCalendar({
      accessToken: accessToken as string,
      calendarId: PRIMARY_CALENDAR,
      selfEmail,
      syncToken,
      ...(syncToken ? {} : windowFor(now())),
      fetchImpl: deps.fetchImpl,
    });

  let result;
  try {
    result = await run(storedToken ?? undefined);
  } catch (err) {
    if (err instanceof GcalError && err.kind === 'sync_token_invalid') {
      // Google aged the token out. Local state may have drifted arbitrarily
      // far, so the only correct recovery is to drop it and refetch the window.
      await deps.repo.clearCalendar(PRIMARY_CALENDAR);
      await deps.repo.setSyncToken(PRIMARY_CALENDAR, null, now().toISOString());
      result = await run(undefined);
    } else if (err instanceof GcalError && err.kind === 'unauthorized') {
      return { ok: false, reason: 'auth-expired' };
    } else {
      return {
        ok: false,
        reason: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  await deps.repo.upsert(result.upserts, now().toISOString());
  await deps.repo.remove(result.deletions);

  // A truncated run has no token; writing null keeps the next sync a full one
  // rather than resuming from a point we never reached.
  await deps.repo.setSyncToken(PRIMARY_CALENDAR, result.nextSyncToken ?? null, now().toISOString());

  return {
    ok: true,
    upserted: result.upserts.length,
    deleted: result.deletions.length,
    truncated: result.truncated,
  };
}

export async function listRange(
  repo: CalendarRepo,
  fromIso: string,
  toIso: string,
): Promise<CalendarEventRow[]> {
  return repo.listBetween(fromIso, toIso);
}

/** Start and end of the user's local day, as UTC instants. */
export function localDayBounds(timezone: string, now: Date): { fromIso: string; toIso: string } {
  // 'sv-SE' formats as YYYY-MM-DD, which Date can parse back with an offset.
  const dateLocal = now.toLocaleDateString('sv-SE', { timeZone: timezone });
  const offsetMin = localOffsetMinutes(timezone, now);
  const startUtcMs = Date.parse(`${dateLocal}T00:00:00Z`) - offsetMin * 60_000;
  return {
    fromIso: new Date(startUtcMs).toISOString(),
    toIso: new Date(startUtcMs + 86_400_000).toISOString(),
  };
}

function localOffsetMinutes(timezone: string, at: Date): number {
  // Difference between the wall clock in `timezone` and UTC at this instant.
  const asUtc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  const asLocal = new Date(at.toLocaleString('en-US', { timeZone: timezone }));
  return Math.round((asLocal.getTime() - asUtc.getTime()) / 60_000);
}

/** Today's events, reduced to the fields the briefing prompt is allowed to see. */
export async function eventsForBrief(
  repo: CalendarRepo,
  timezone: string,
  now: Date,
): Promise<BriefEvent[]> {
  const { fromIso, toIso } = localDayBounds(timezone, now);
  const rows = await repo.listBetween(fromIso, toIso);
  return rows
    .filter((e) => e.selfResponse !== 'declined')
    .map((e) => ({
      id: e.id,
      start: e.startAt,
      end: e.endAt,
      summary: e.summary,
      attendeeCount: e.attendees.length,
      hasConference: e.hasConference,
      isFocusBlock: e.isFocusBlock,
    }));
}
