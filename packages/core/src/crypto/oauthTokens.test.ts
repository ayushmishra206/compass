import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearOAuthGrant,
  getAccessToken,
  getOAuthGrant,
  hasOAuthGrant,
  OAuthGrantLocked,
  setAccessToken,
  setOAuthGrant,
} from './oauthTokens';
import { encrypt } from './keystore';

let local: Record<string, unknown>;
let session: Record<string, unknown>;

beforeEach(() => {
  local = {};
  session = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: local[key] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(local, obj);
        }),
        remove: vi.fn(async (key: string) => {
          delete local[key];
        }),
      },
      session: {
        get: vi.fn(async (key: string) => ({ [key]: session[key] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(session, obj);
        }),
        remove: vi.fn(async (key: string) => {
          delete session[key];
        }),
      },
    },
  });
});

const GRANT = {
  provider: 'google' as const,
  refreshToken: '1//refresh-token',
  scope: 'https://www.googleapis.com/auth/calendar.readonly',
  email: 'me@example.com',
  grantedAt: '2026-08-02T10:00:00.000Z',
};

describe('setOAuthGrant / getOAuthGrant', () => {
  it('returns null when nothing is stored', async () => {
    expect(await getOAuthGrant('google')).toBeNull();
  });

  it('round-trips a grant', async () => {
    await setOAuthGrant(GRANT);
    const out = await getOAuthGrant('google');
    expect(out?.refreshToken).toBe('1//refresh-token');
    expect(out?.email).toBe('me@example.com');
  });

  it('keeps providers separate', async () => {
    await setOAuthGrant(GRANT);
    expect(await getOAuthGrant('openrouter')).toBeNull();
  });

  it('overwrites an existing grant for the same provider', async () => {
    await setOAuthGrant(GRANT);
    await setOAuthGrant({ ...GRANT, refreshToken: '1//new' });
    expect((await getOAuthGrant('google'))?.refreshToken).toBe('1//new');
  });
});

describe('encryption at rest', () => {
  it('never writes the refresh token in the clear once encryption is on', async () => {
    await chrome.storage.session.set({ 'llm.creds.v1.kek': 'correct horse battery staple' });
    await chrome.storage.local.set({
      'oauth.grants.v1': await encrypt('{}', 'correct horse battery staple'),
    });

    await setOAuthGrant(GRANT);

    expect(JSON.stringify(local['oauth.grants.v1'])).not.toContain('1//refresh-token');
  });

  it('reads an encrypted grant back when the passphrase is cached', async () => {
    await chrome.storage.session.set({ 'llm.creds.v1.kek': 'pass' });
    await chrome.storage.local.set({ 'oauth.grants.v1': await encrypt('{}', 'pass') });
    await setOAuthGrant(GRANT);

    expect((await getOAuthGrant('google'))?.refreshToken).toBe('1//refresh-token');
  });

  it('refuses to read an encrypted grant while locked', async () => {
    await chrome.storage.session.set({ 'llm.creds.v1.kek': 'pass' });
    await chrome.storage.local.set({ 'oauth.grants.v1': await encrypt('{}', 'pass') });
    await setOAuthGrant(GRANT);

    delete session['llm.creds.v1.kek'];
    await expect(getOAuthGrant('google')).rejects.toBeInstanceOf(OAuthGrantLocked);
  });

  it('refuses to write an encrypted grant while locked', async () => {
    await chrome.storage.session.set({ 'llm.creds.v1.kek': 'pass' });
    await chrome.storage.local.set({ 'oauth.grants.v1': await encrypt('{}', 'pass') });
    delete session['llm.creds.v1.kek'];

    await expect(setOAuthGrant(GRANT)).rejects.toBeInstanceOf(OAuthGrantLocked);
  });
});

describe('access tokens', () => {
  it('are session-scoped, never written to local storage', async () => {
    await setAccessToken('google', 'ya29.access', '2026-08-02T11:00:00.000Z');
    expect(JSON.stringify(local)).not.toContain('ya29.access');
    expect(JSON.stringify(session)).toContain('ya29.access');
  });

  it('round-trip while unexpired', async () => {
    await setAccessToken('google', 'ya29.access', '2026-08-02T11:00:00.000Z');
    const t = await getAccessToken('google', new Date('2026-08-02T10:30:00.000Z'));
    expect(t).toBe('ya29.access');
  });

  it('are treated as absent once expired', async () => {
    await setAccessToken('google', 'ya29.access', '2026-08-02T11:00:00.000Z');
    const t = await getAccessToken('google', new Date('2026-08-02T11:30:00.000Z'));
    expect(t).toBeNull();
  });

  it('expire early by a safety margin so a token cannot die mid-request', async () => {
    await setAccessToken('google', 'ya29.access', '2026-08-02T11:00:00.000Z');
    // 30s before nominal expiry — inside the 60s skew window.
    const t = await getAccessToken('google', new Date('2026-08-02T10:59:30.000Z'));
    expect(t).toBeNull();
  });

  it('return null when never set', async () => {
    expect(await getAccessToken('google', new Date())).toBeNull();
  });
});

describe('clearOAuthGrant', () => {
  it('removes both the refresh grant and the access token', async () => {
    await setOAuthGrant(GRANT);
    await setAccessToken('google', 'ya29.access', '2026-08-02T11:00:00.000Z');

    await clearOAuthGrant('google');

    expect(await getOAuthGrant('google')).toBeNull();
    expect(await getAccessToken('google', new Date('2026-08-02T10:00:00.000Z'))).toBeNull();
  });

  it('leaves other providers intact', async () => {
    await setOAuthGrant(GRANT);
    await setOAuthGrant({ ...GRANT, provider: 'openrouter', refreshToken: 'other' });
    await clearOAuthGrant('google');
    expect((await getOAuthGrant('openrouter'))?.refreshToken).toBe('other');
  });
});

describe('hasOAuthGrant', () => {
  it('reports connection state without decrypting', async () => {
    await chrome.storage.session.set({ 'llm.creds.v1.kek': 'pass' });
    await chrome.storage.local.set({ 'oauth.grants.v1': await encrypt('{}', 'pass') });
    await setOAuthGrant(GRANT);
    delete session['llm.creds.v1.kek'];

    // Locked — but the UI still needs to render "Connected" without the key.
    await expect(hasOAuthGrant('google')).resolves.toBe(true);
  });

  it('is false when nothing is stored', async () => {
    expect(await hasOAuthGrant('google')).toBe(false);
  });
});
