import type { CalendarEventRow } from '@compass/core';
import { isCancelled, mapGoogleEvent, type GoogleEvent } from './mapper';

const API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_MAX_PAGES = 20;
const PAGE_SIZE = 250;

export type GcalErrorKind =
  | 'sync_token_invalid'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export class GcalError extends Error {
  readonly kind: GcalErrorKind;
  readonly status: number;
  /** Whether a later retry could plausibly succeed without user action. */
  readonly retryable: boolean;

  constructor(kind: GcalErrorKind, status: number) {
    super(`GCAL_${kind.toUpperCase()}: ${status}`);
    this.name = 'GcalError';
    this.kind = kind;
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

function classify(status: number): GcalErrorKind {
  // 410 Gone is Google's signal that an incremental syncToken has aged out;
  // the only recovery is to drop local state and do a fresh full sync.
  if (status === 410) return 'sync_token_invalid';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

export interface EventPageResponse {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export async function fetchEventPage(opts: {
  accessToken: string;
  calendarId: string;
  syncToken?: string;
  pageToken?: string;
  timeMin?: string;
  timeMax?: string;
  fetchImpl?: typeof fetch;
}): Promise<EventPageResponse> {
  const doFetch = opts.fetchImpl ?? fetch;
  const url = new URL(`${API_BASE}/calendars/${encodeURIComponent(opts.calendarId)}/events`);

  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('maxResults', String(PAGE_SIZE));

  if (opts.syncToken) {
    // Google rejects syncToken combined with time bounds or ordering, so an
    // incremental request carries the token and nothing else.
    url.searchParams.set('syncToken', opts.syncToken);
    url.searchParams.set('showDeleted', 'true');
  } else {
    if (opts.timeMin) url.searchParams.set('timeMin', opts.timeMin);
    if (opts.timeMax) url.searchParams.set('timeMax', opts.timeMax);
    url.searchParams.set('orderBy', 'startTime');
  }
  if (opts.pageToken) url.searchParams.set('pageToken', opts.pageToken);

  const res = await doFetch(url.toString(), {
    headers: { Authorization: `Bearer ${opts.accessToken}`, Accept: 'application/json' },
  });

  if (!res.ok) throw new GcalError(classify(res.status), res.status);
  return (await res.json()) as EventPageResponse;
}

export interface SyncResult {
  upserts: CalendarEventRow[];
  /** Ids Google reported as cancelled; delete these locally. */
  deletions: string[];
  /** Token for the next incremental sync, absent if the run was truncated. */
  nextSyncToken?: string;
  /** True when the page cap stopped us before Google ran out of pages. */
  truncated: boolean;
}

export async function syncCalendar(opts: {
  accessToken: string;
  calendarId: string;
  selfEmail: string;
  syncToken?: string;
  timeMin?: string;
  timeMax?: string;
  fetchImpl?: typeof fetch;
  maxPages?: number;
}): Promise<SyncResult> {
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const upserts: CalendarEventRow[] = [];
  const deletions: string[] = [];

  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  let truncated = false;

  for (let pageCount = 0; pageCount < maxPages; pageCount++) {
    const res = await fetchEventPage({
      accessToken: opts.accessToken,
      calendarId: opts.calendarId,
      syncToken: opts.syncToken,
      pageToken,
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      fetchImpl: opts.fetchImpl,
    });

    for (const raw of res.items ?? []) {
      if (isCancelled(raw)) deletions.push(raw.id);
      else upserts.push(mapGoogleEvent(raw, opts.calendarId, opts.selfEmail));
    }

    nextSyncToken = res.nextSyncToken;
    pageToken = res.nextPageToken;

    if (!pageToken) return { upserts, deletions, nextSyncToken, truncated: false };
  }

  // Fell out of the loop with pages still pending. Returning no syncToken is
  // deliberate: persisting one here would silently skip the unread remainder.
  truncated = true;
  return { upserts, deletions, nextSyncToken: undefined, truncated };
}
