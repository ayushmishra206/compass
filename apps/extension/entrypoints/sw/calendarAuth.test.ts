import { describe, expect, it, vi, beforeEach } from 'vitest';
import { connectGoogleCalendar } from './calendarAuth';
import { getOAuthGrant } from '@compass/core';

const REDIRECT = 'https://abc.chromiumapp.org/';

let local: Record<string, unknown>;
let session: Record<string, unknown>;

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

const tokenResponse = (body: Record<string, unknown>) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => '',
});

function deps(over: { callback?: (state: string) => string; fetchImpl?: unknown } = {}) {
  const launchWebAuthFlow = vi.fn(async ({ url }: { url: string }) => {
    const state = new URL(url).searchParams.get('state') ?? '';
    return `${REDIRECT}?${(over.callback ?? ((s: string) => `code=CODE&state=${s}`))(state)}`;
  });
  const fetchImpl =
    over.fetchImpl ??
    vi.fn(async (url: string) => {
      if (String(url).includes('userinfo')) {
        return tokenResponse({ email: 'me@example.com' });
      }
      return tokenResponse({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 });
    });
  return {
    launchWebAuthFlow,
    getRedirectURL: () => REDIRECT,
    fetchImpl: fetchImpl as typeof fetch,
  };
}

describe('connectGoogleCalendar', () => {
  it('stores the grant on success', async () => {
    const res = await connectGoogleCalendar('client-id', deps());
    expect(res.ok).toBe(true);
    expect(res.email).toBe('me@example.com');
    expect((await getOAuthGrant('google'))?.refreshToken).toBe('RT');
  });

  it('requests only the read-only calendar scope', async () => {
    const d = deps();
    await connectGoogleCalendar('client-id', d);
    const scope = new URL(d.launchWebAuthFlow.mock.calls[0]![0].url).searchParams.get('scope');
    expect(scope).toContain('calendar.readonly');
    expect(scope).not.toContain('gmail');
    expect(scope).not.toContain('calendar.events');
  });

  it('rejects an empty client id before opening a window', async () => {
    const d = deps();
    const res = await connectGoogleCalendar('   ', d);
    expect(res.ok).toBe(false);
    expect(d.launchWebAuthFlow).not.toHaveBeenCalled();
  });

  it('fails with actionable guidance when no refresh token comes back', async () => {
    const fetchImpl = vi.fn(async () => tokenResponse({ access_token: 'AT', expires_in: 3600 }));
    const res = await connectGoogleCalendar('client-id', deps({ fetchImpl }));
    expect(res.ok).toBe(false);
    expect(res.error).toContain('myaccount.google.com');
  });

  it('stores nothing when the refresh token is missing', async () => {
    const fetchImpl = vi.fn(async () => tokenResponse({ access_token: 'AT', expires_in: 3600 }));
    await connectGoogleCalendar('client-id', deps({ fetchImpl }));
    expect(await getOAuthGrant('google')).toBeNull();
  });

  it('reports a declined consent screen in plain language', async () => {
    const res = await connectGoogleCalendar(
      'client-id',
      deps({ callback: (s) => `error=access_denied&state=${s}` }),
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain('declined');
  });

  it('reports a forged callback without leaking the internal code', async () => {
    const res = await connectGoogleCalendar(
      'client-id',
      deps({ callback: () => 'code=X&state=FORGED' }),
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain('could not be verified');
    expect(res.error).not.toContain('OAUTH_STATE_MISMATCH');
  });

  it('still connects when the userinfo lookup fails', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('userinfo')) throw new Error('offline');
      return tokenResponse({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 });
    });
    const res = await connectGoogleCalendar('client-id', deps({ fetchImpl }));
    expect(res.ok).toBe(true);
    expect(res.email).toBeUndefined();
  });
});
