import { describe, expect, it, vi, beforeEach } from 'vitest';
import { syncPrimaryCalendar } from './calendar';
import { setOAuthGrant, setAccessToken } from '@compass/core';
import type { CalendarRepo } from '@compass/db';

let local: Record<string, unknown>;
let session: Record<string, unknown>;

function makeRepo(over: Partial<CalendarRepo> = {}): CalendarRepo {
  return {
    upsert: vi.fn(async () => {}),
    listBetween: vi.fn(async () => []),
    remove: vi.fn(async () => {}),
    getSyncToken: vi.fn(async () => null),
    setSyncToken: vi.fn(async () => {}),
    clearCalendar: vi.fn(async () => {}),
    ...over,
  } as CalendarRepo;
}

const page = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => '',
});

const EVENT = (id: string) => ({
  id,
  status: 'confirmed',
  summary: id,
  updated: '2026-08-01T00:00:00.000Z',
  start: { dateTime: '2026-08-02T09:00:00.000Z' },
  end: { dateTime: '2026-08-02T10:00:00.000Z' },
});

const NOW = () => new Date('2026-08-02T08:00:00.000Z');

beforeEach(() => {
  local = {};
  session = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (k: string) => ({ [k]: local[k] })),
        set: vi.fn(async (o: Record<string, unknown>) => {
          Object.assign(local, o);
        }),
        remove: vi.fn(async (k: string) => {
          delete local[k];
        }),
      },
      session: {
        get: vi.fn(async (k: string) => ({ [k]: session[k] })),
        set: vi.fn(async (o: Record<string, unknown>) => {
          Object.assign(session, o);
        }),
        remove: vi.fn(async (k: string) => {
          delete session[k];
        }),
      },
    },
  });
});

async function connect() {
  await setOAuthGrant({
    provider: 'google',
    refreshToken: 'RT',
    scope: 'calendar.readonly',
    email: 'me@example.com',
    grantedAt: '2026-08-01T00:00:00.000Z',
  });
}

describe('preconditions', () => {
  it('reports not-connected with no grant', async () => {
    const res = await syncPrimaryCalendar({ repo: makeRepo(), clientId: 'C', now: NOW });
    expect(res).toEqual({ ok: false, reason: 'not-connected' });
  });

  it('reports auth-expired when there is no way to get a token', async () => {
    await connect();
    // No cached access token and no client id to refresh with.
    const res = await syncPrimaryCalendar({ repo: makeRepo(), now: NOW });
    expect(res).toMatchObject({ ok: false, reason: 'auth-expired' });
  });
});

describe('happy path', () => {
  it('persists upserts and deletions', async () => {
    await connect();
    await setAccessToken('google', 'AT', '2026-08-02T09:00:00.000Z');
    const repo = makeRepo();
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(
        page({ items: [EVENT('a'), { id: 'gone', status: 'cancelled' }], nextSyncToken: 'NEW' }),
      ),
    );

    const res = await syncPrimaryCalendar({
      repo,
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res).toMatchObject({ ok: true, upserted: 1, deleted: 1, truncated: false });
    expect(repo.upsert).toHaveBeenCalled();
    expect(repo.remove).toHaveBeenCalledWith(['gone']);
    expect(repo.setSyncToken).toHaveBeenCalledWith('primary', 'NEW', expect.any(String));
  });

  it('sends a bounded window on a first sync', async () => {
    await connect();
    await setAccessToken('google', 'AT', '2026-08-02T09:00:00.000Z');
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(page({ items: [], nextSyncToken: 'NEW' })),
    );
    await syncPrimaryCalendar({
      repo: makeRepo(),
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const url = new URL(String(fetchImpl.mock.calls[0]![0]));
    expect(url.searchParams.get('timeMin')).toBeTruthy();
    expect(url.searchParams.get('timeMax')).toBeTruthy();
  });

  it('uses the stored token on a later sync', async () => {
    await connect();
    await setAccessToken('google', 'AT', '2026-08-02T09:00:00.000Z');
    const repo = makeRepo({ getSyncToken: vi.fn(async () => 'STORED') });
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(page({ items: [], nextSyncToken: 'NEW' })),
    );
    await syncPrimaryCalendar({
      repo,
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(new URL(String(fetchImpl.mock.calls[0]![0])).searchParams.get('syncToken')).toBe(
      'STORED',
    );
  });
});

describe('token refresh', () => {
  it('refreshes when no access token is cached', async () => {
    await connect();
    const fetchImpl = vi.fn((url: string, _init?: RequestInit) =>
      Promise.resolve(
        String(url).includes('oauth2.googleapis.com/token')
          ? page({ access_token: 'FRESH', expires_in: 3600 })
          : page({ items: [], nextSyncToken: 'NEW' }),
      ),
    );
    const res = await syncPrimaryCalendar({
      repo: makeRepo(),
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.ok).toBe(true);
    const calendarCall = fetchImpl.mock.calls.find((c) => String(c[0]).includes('calendar/v3'));
    expect((calendarCall![1] as RequestInit | undefined)?.headers).toMatchObject({
      Authorization: 'Bearer FRESH',
    });
  });

  it('clears the grant and reports auth-expired when access was revoked', async () => {
    await connect();
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(page({ error: 'invalid_grant' }, 400)),
    );
    const res = await syncPrimaryCalendar({
      repo: makeRepo(),
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toMatchObject({ ok: false, reason: 'auth-expired' });
    expect(JSON.stringify(local['oauth.grants.v1'] ?? {})).not.toContain('RT');
  });
});

describe('expired sync token recovery', () => {
  it('clears local state and refetches the window on 410', async () => {
    await connect();
    await setAccessToken('google', 'AT', '2026-08-02T09:00:00.000Z');
    const repo = makeRepo({ getSyncToken: vi.fn(async () => 'STALE') });

    let call = 0;
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) => {
      call++;
      return Promise.resolve(
        call === 1
          ? page({ error: 'gone' }, 410)
          : page({ items: [EVENT('a')], nextSyncToken: 'NEW' }),
      );
    });

    const res = await syncPrimaryCalendar({
      repo,
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(repo.clearCalendar).toHaveBeenCalledWith('primary');
    expect(res).toMatchObject({ ok: true, upserted: 1 });
    // The retry must be a full sync, not another attempt with the dead token.
    expect(new URL(String(fetchImpl.mock.calls[1]![0])).searchParams.get('syncToken')).toBeNull();
  });
});

describe('failure reporting', () => {
  it('maps a 401 to auth-expired', async () => {
    await connect();
    await setAccessToken('google', 'AT', '2026-08-02T09:00:00.000Z');
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(page({ error: 'unauthorized' }, 401)),
    );
    const res = await syncPrimaryCalendar({
      repo: makeRepo(),
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toMatchObject({ ok: false, reason: 'auth-expired' });
  });

  it('maps a server error to a generic failure without persisting anything', async () => {
    await connect();
    await setAccessToken('google', 'AT', '2026-08-02T09:00:00.000Z');
    const repo = makeRepo();
    const fetchImpl = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(page({ error: 'boom' }, 503)),
    );
    const res = await syncPrimaryCalendar({
      repo,
      clientId: 'C',
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toMatchObject({ ok: false, reason: 'error' });
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(repo.setSyncToken).not.toHaveBeenCalled();
  });
});
