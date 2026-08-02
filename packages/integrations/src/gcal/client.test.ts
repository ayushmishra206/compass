import { describe, expect, it, vi } from 'vitest';
import { fetchEventPage, GcalError, syncCalendar } from './client';

const page = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const EVENT = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  status: 'confirmed',
  summary: `Event ${id}`,
  updated: '2026-08-01T00:00:00.000Z',
  start: { dateTime: '2026-08-02T09:00:00.000Z' },
  end: { dateTime: '2026-08-02T10:00:00.000Z' },
  ...over,
});

describe('fetchEventPage', () => {
  it('sends the bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ items: [] }));
    await fetchEventPage({ accessToken: 'AT', calendarId: 'primary', fetchImpl });
    const init = fetchImpl.mock.calls[0]![1];
    expect(init.headers.Authorization).toBe('Bearer AT');
  });

  it('url-encodes the calendar id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ items: [] }));
    await fetchEventPage({ accessToken: 'AT', calendarId: 'a b@example.com', fetchImpl });
    expect(fetchImpl.mock.calls[0]![0]).toContain('a%20b%40example.com');
  });

  it('expands recurring events into instances', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ items: [] }));
    await fetchEventPage({ accessToken: 'AT', calendarId: 'primary', fetchImpl });
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.searchParams.get('singleEvents')).toBe('true');
  });

  it('uses the sync token alone when one exists', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ items: [] }));
    await fetchEventPage({
      accessToken: 'AT',
      calendarId: 'primary',
      syncToken: 'TOK',
      timeMin: '2026-08-01T00:00:00.000Z',
      fetchImpl,
    });
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.searchParams.get('syncToken')).toBe('TOK');
    // Google rejects timeMin combined with syncToken.
    expect(url.searchParams.get('timeMin')).toBeNull();
    expect(url.searchParams.get('showDeleted')).toBe('true');
  });

  it('uses the time window on a first sync', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ items: [] }));
    await fetchEventPage({
      accessToken: 'AT',
      calendarId: 'primary',
      timeMin: '2026-08-01T00:00:00.000Z',
      timeMax: '2026-08-08T00:00:00.000Z',
      fetchImpl,
    });
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.searchParams.get('timeMin')).toBe('2026-08-01T00:00:00.000Z');
    expect(url.searchParams.get('timeMax')).toBe('2026-08-08T00:00:00.000Z');
    expect(url.searchParams.get('syncToken')).toBeNull();
  });

  it('raises a typed error when the sync token has expired', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ error: 'gone' }, 410));
    await expect(
      fetchEventPage({ accessToken: 'AT', calendarId: 'primary', syncToken: 'OLD', fetchImpl }),
    ).rejects.toMatchObject({ kind: 'sync_token_invalid' });
  });

  it('raises a typed error when the access token is rejected', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ error: 'unauthorized' }, 401));
    await expect(
      fetchEventPage({ accessToken: 'STALE', calendarId: 'primary', fetchImpl }),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('raises a typed error when the grant was revoked', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ error: 'forbidden' }, 403));
    await expect(
      fetchEventPage({ accessToken: 'AT', calendarId: 'primary', fetchImpl }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('raises a retryable error on rate limiting', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ error: 'slow down' }, 429));
    await expect(
      fetchEventPage({ accessToken: 'AT', calendarId: 'primary', fetchImpl }),
    ).rejects.toMatchObject({ kind: 'rate_limited', retryable: true });
  });
});

describe('syncCalendar', () => {
  const deps = (pages: unknown[]) => {
    const fetchImpl = vi.fn();
    for (const p of pages) fetchImpl.mockResolvedValueOnce(page(p));
    return fetchImpl;
  };

  it('maps returned events into rows', async () => {
    const fetchImpl = deps([{ items: [EVENT('a'), EVENT('b')], nextSyncToken: 'NEW' }]);
    const res = await syncCalendar({
      accessToken: 'AT',
      calendarId: 'primary',
      selfEmail: 'me@example.com',
      fetchImpl,
    });
    expect(res.upserts.map((e) => e.id)).toEqual(['a', 'b']);
    expect(res.nextSyncToken).toBe('NEW');
  });

  it('follows pagination until the last page', async () => {
    const fetchImpl = deps([
      { items: [EVENT('a')], nextPageToken: 'P2' },
      { items: [EVENT('b')], nextPageToken: 'P3' },
      { items: [EVENT('c')], nextSyncToken: 'NEW' },
    ]);
    const res = await syncCalendar({
      accessToken: 'AT',
      calendarId: 'primary',
      selfEmail: 'me@example.com',
      fetchImpl,
    });
    expect(res.upserts.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(new URL(fetchImpl.mock.calls[1]![0]).searchParams.get('pageToken')).toBe('P2');
  });

  it('separates cancelled tombstones from live events', async () => {
    const fetchImpl = deps([
      {
        items: [EVENT('live'), { id: 'dead', status: 'cancelled' }],
        nextSyncToken: 'NEW',
      },
    ]);
    const res = await syncCalendar({
      accessToken: 'AT',
      calendarId: 'primary',
      selfEmail: 'me@example.com',
      fetchImpl,
    });
    expect(res.upserts.map((e) => e.id)).toEqual(['live']);
    expect(res.deletions).toEqual(['dead']);
  });

  it('reports that a full resync is needed when the token expired', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(page({ error: 'gone' }, 410));
    await expect(
      syncCalendar({
        accessToken: 'AT',
        calendarId: 'primary',
        selfEmail: 'me@example.com',
        syncToken: 'OLD',
        fetchImpl,
      }),
    ).rejects.toMatchObject({ kind: 'sync_token_invalid' });
  });

  it('stops paginating at the page cap so a bad token cannot spin forever', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(page({ items: [EVENT('x')], nextPageToken: 'SAME' }));
    const res = await syncCalendar({
      accessToken: 'AT',
      calendarId: 'primary',
      selfEmail: 'me@example.com',
      fetchImpl,
      maxPages: 3,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(res.truncated).toBe(true);
  });

  it('is not truncated on a normal run', async () => {
    const fetchImpl = deps([{ items: [EVENT('a')], nextSyncToken: 'NEW' }]);
    const res = await syncCalendar({
      accessToken: 'AT',
      calendarId: 'primary',
      selfEmail: 'me@example.com',
      fetchImpl,
    });
    expect(res.truncated).toBe(false);
  });

  it('tolerates a page with no items array', async () => {
    const fetchImpl = deps([{ nextSyncToken: 'NEW' }]);
    const res = await syncCalendar({
      accessToken: 'AT',
      calendarId: 'primary',
      selfEmail: 'me@example.com',
      fetchImpl,
    });
    expect(res.upserts).toEqual([]);
  });
});

describe('GcalError', () => {
  it('marks 5xx and 429 as retryable, 4xx as not', () => {
    expect(new GcalError('rate_limited', 429).retryable).toBe(true);
    expect(new GcalError('server', 503).retryable).toBe(true);
    expect(new GcalError('unauthorized', 401).retryable).toBe(false);
  });
});
