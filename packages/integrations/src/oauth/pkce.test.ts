import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthorizeUrl,
  deriveChallenge,
  exchangeCodeForTokens,
  generateState,
  generateVerifier,
  parseCallback,
  startPkceFlow,
  type PkceProvider,
} from './pkce';

const PROVIDER: PkceProvider = {
  id: 'google',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  clientId: 'test-client.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'openid'],
  extraAuthParams: { access_type: 'offline', prompt: 'consent' },
};

const REDIRECT = 'https://abcdef.chromiumapp.org/';

describe('generateVerifier', () => {
  it('produces a verifier in the RFC 7636 length window', () => {
    const v = generateVerifier();
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
  });

  it('uses only unreserved base64url characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateVerifier()).toMatch(/^[A-Za-z0-9\-._~]+$/);
    }
  });

  it('never repeats across calls', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateVerifier()));
    expect(seen.size).toBe(50);
  });
});

describe('deriveChallenge', () => {
  // RFC 7636 Appendix B reference vector.
  it('matches the RFC 7636 S256 test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    await expect(deriveChallenge(verifier)).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('is deterministic for a given verifier', async () => {
    const v = generateVerifier();
    expect(await deriveChallenge(v)).toBe(await deriveChallenge(v));
  });

  it('produces unpadded base64url', async () => {
    const c = await deriveChallenge(generateVerifier());
    expect(c).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(c).not.toContain('=');
  });
});

describe('generateState', () => {
  it('never repeats across calls', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateState()));
    expect(seen.size).toBe(50);
  });
});

describe('buildAuthorizeUrl', () => {
  const url = () =>
    new URL(
      buildAuthorizeUrl(PROVIDER, { challenge: 'CHALLENGE', state: 'STATE', redirect: REDIRECT }),
    );

  it('targets the provider authorize endpoint', () => {
    expect(url().origin + url().pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('always requests S256, never plain', () => {
    expect(url().searchParams.get('code_challenge_method')).toBe('S256');
    expect(url().searchParams.get('code_challenge')).toBe('CHALLENGE');
  });

  it('carries client, redirect, state and response type', () => {
    const p = url().searchParams;
    expect(p.get('client_id')).toBe(PROVIDER.clientId);
    expect(p.get('redirect_uri')).toBe(REDIRECT);
    expect(p.get('state')).toBe('STATE');
    expect(p.get('response_type')).toBe('code');
  });

  it('space-joins scopes', () => {
    expect(url().searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/calendar.readonly openid',
    );
  });

  it('passes provider-specific params through', () => {
    expect(url().searchParams.get('access_type')).toBe('offline');
    expect(url().searchParams.get('prompt')).toBe('consent');
  });

  it('never puts the verifier in the authorize URL', () => {
    const raw = buildAuthorizeUrl(PROVIDER, {
      challenge: 'CHALLENGE',
      state: 'STATE',
      redirect: REDIRECT,
    });
    expect(raw).not.toContain('code_verifier');
  });
});

describe('parseCallback', () => {
  it('returns the code when state matches', () => {
    expect(parseCallback(`${REDIRECT}?code=AUTH_CODE&state=STATE`, 'STATE')).toBe('AUTH_CODE');
  });

  it('rejects a mismatched state', () => {
    expect(() => parseCallback(`${REDIRECT}?code=X&state=EVIL`, 'STATE')).toThrow(
      'OAUTH_STATE_MISMATCH',
    );
  });

  it('rejects a missing state even when a code is present', () => {
    expect(() => parseCallback(`${REDIRECT}?code=X`, 'STATE')).toThrow('OAUTH_STATE_MISMATCH');
  });

  it('surfaces a provider error instead of a generic failure', () => {
    expect(() => parseCallback(`${REDIRECT}?error=access_denied&state=STATE`, 'STATE')).toThrow(
      'access_denied',
    );
  });

  it('checks state before reading the error, so a forged error cannot leak', () => {
    expect(() => parseCallback(`${REDIRECT}?error=access_denied&state=EVIL`, 'STATE')).toThrow(
      'OAUTH_STATE_MISMATCH',
    );
  });

  it('rejects a callback with neither code nor error', () => {
    expect(() => parseCallback(`${REDIRECT}?state=STATE`, 'STATE')).toThrow('OAUTH_NO_CODE');
  });
});

describe('exchangeCodeForTokens', () => {
  const okResponse = (body: unknown) =>
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    });

  it('posts the verifier and code as form-encoded body', async () => {
    const fetchImpl = okResponse({
      access_token: 'AT',
      refresh_token: 'RT',
      expires_in: 3599,
      scope: 'openid',
      token_type: 'Bearer',
    });
    await exchangeCodeForTokens(PROVIDER, {
      code: 'CODE',
      verifier: 'VERIFIER',
      redirect: REDIRECT,
      fetchImpl,
      now: () => new Date('2026-08-02T10:00:00Z'),
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(PROVIDER.tokenUrl);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    const body = new URLSearchParams(init.body as string);
    expect(body.get('code')).toBe('CODE');
    expect(body.get('code_verifier')).toBe('VERIFIER');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('redirect_uri')).toBe(REDIRECT);
    expect(body.get('client_id')).toBe(PROVIDER.clientId);
  });

  it('never sends a client secret — extensions are public clients', async () => {
    const fetchImpl = okResponse({ access_token: 'AT', expires_in: 60, token_type: 'Bearer' });
    await exchangeCodeForTokens(PROVIDER, {
      code: 'CODE',
      verifier: 'V',
      redirect: REDIRECT,
      fetchImpl,
    });
    const body = new URLSearchParams(fetchImpl.mock.calls[0]![1].body as string);
    expect(body.get('client_secret')).toBeNull();
  });

  it('converts expires_in into an absolute expiry', async () => {
    const fetchImpl = okResponse({
      access_token: 'AT',
      refresh_token: 'RT',
      expires_in: 3600,
      token_type: 'Bearer',
    });
    const tokens = await exchangeCodeForTokens(PROVIDER, {
      code: 'C',
      verifier: 'V',
      redirect: REDIRECT,
      fetchImpl,
      now: () => new Date('2026-08-02T10:00:00Z'),
    });
    expect(tokens.expiresAt).toBe('2026-08-02T11:00:00.000Z');
    expect(tokens.accessToken).toBe('AT');
    expect(tokens.refreshToken).toBe('RT');
  });

  it('tolerates a response with no refresh token', async () => {
    const fetchImpl = okResponse({ access_token: 'AT', expires_in: 60, token_type: 'Bearer' });
    const tokens = await exchangeCodeForTokens(PROVIDER, {
      code: 'C',
      verifier: 'V',
      redirect: REDIRECT,
      fetchImpl,
    });
    expect(tokens.refreshToken).toBeUndefined();
  });

  it('throws a typed error on a non-2xx exchange', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":"invalid_grant"}',
      json: async () => ({ error: 'invalid_grant' }),
    });
    await expect(
      exchangeCodeForTokens(PROVIDER, {
        code: 'C',
        verifier: 'V',
        redirect: REDIRECT,
        fetchImpl,
      }),
    ).rejects.toThrow('OAUTH_TOKEN_EXCHANGE_FAILED');
  });

  it('rejects a 200 response that omits an access token', async () => {
    const fetchImpl = okResponse({ token_type: 'Bearer' });
    await expect(
      exchangeCodeForTokens(PROVIDER, {
        code: 'C',
        verifier: 'V',
        redirect: REDIRECT,
        fetchImpl,
      }),
    ).rejects.toThrow('OAUTH_TOKEN_EXCHANGE_FAILED');
  });
});

describe('startPkceFlow', () => {
  const deps = (callbackQuery: (state: string) => string) => {
    const launchWebAuthFlow = vi.fn(async ({ url }: { url: string }) => {
      const state = new URL(url).searchParams.get('state') ?? '';
      return `${REDIRECT}?${callbackQuery(state)}`;
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'AT', refresh_token: 'RT', expires_in: 60 }),
      text: async () => '',
    });
    return { launchWebAuthFlow, getRedirectURL: () => REDIRECT, fetchImpl };
  };

  it('completes the happy path and returns tokens', async () => {
    const d = deps((state) => `code=CODE&state=${state}`);
    const tokens = await startPkceFlow(PROVIDER, d);
    expect(tokens.accessToken).toBe('AT');
    expect(d.launchWebAuthFlow).toHaveBeenCalledWith(
      expect.objectContaining({ interactive: true }),
    );
  });

  it('sends the same verifier it committed to via the challenge', async () => {
    const d = deps((state) => `code=CODE&state=${state}`);
    await startPkceFlow(PROVIDER, d);

    const authUrl = new URL(d.launchWebAuthFlow.mock.calls[0]![0].url);
    const sentChallenge = authUrl.searchParams.get('code_challenge');
    const body = new URLSearchParams(d.fetchImpl.mock.calls[0]![1].body as string);
    const usedVerifier = body.get('code_verifier') as string;

    expect(await deriveChallenge(usedVerifier)).toBe(sentChallenge);
  });

  it('aborts before token exchange when the callback state is forged', async () => {
    const d = deps(() => 'code=CODE&state=FORGED');
    await expect(startPkceFlow(PROVIDER, d)).rejects.toThrow('OAUTH_STATE_MISMATCH');
    expect(d.fetchImpl).not.toHaveBeenCalled();
  });

  it('uses a fresh verifier and state on every flow', async () => {
    const d = deps((state) => `code=CODE&state=${state}`);
    await startPkceFlow(PROVIDER, d);
    await startPkceFlow(PROVIDER, d);
    const first = new URL(d.launchWebAuthFlow.mock.calls[0]![0].url).searchParams;
    const second = new URL(d.launchWebAuthFlow.mock.calls[1]![0].url).searchParams;
    expect(first.get('code_challenge')).not.toBe(second.get('code_challenge'));
    expect(first.get('state')).not.toBe(second.get('state'));
  });
});
