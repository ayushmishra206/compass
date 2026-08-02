/**
 * OAuth 2.0 Authorization Code flow with PKCE (RFC 7636), for public clients.
 *
 * Browser extensions cannot hold a client secret, so PKCE is the only safe
 * option: the client commits to a secret `verifier` up front by sending its
 * SHA-256 `challenge`, then proves possession at token-exchange time. An
 * attacker who intercepts the authorization code cannot redeem it without the
 * verifier, which never leaves this module until the exchange POST.
 *
 * Per PRD §7.4 this must be driven from the service worker, never a popup —
 * a popup can be dismissed mid-flow and take the pending promise with it.
 *
 * The browser-facing surface is injected rather than imported so the flow is
 * testable without a live `browser.identity`, and so this file stays free of
 * `chrome.*` calls (AGENTS.md forbids them outside the extension layer).
 */

export interface PkceProvider {
  id: 'google' | 'openrouter';
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string[];
  /** Provider-specific authorize params, e.g. Google's access_type=offline. */
  extraAuthParams?: Record<string, string>;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Absolute ISO-8601 expiry. Absolute, not a duration, so it survives storage. */
  expiresAt: string;
  scope?: string;
  tokenType: string;
}

export interface PkceFlowDeps {
  launchWebAuthFlow: (opts: { url: string; interactive: boolean }) => Promise<string>;
  getRedirectURL: () => string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const VERIFIER_BYTES = 32; // → 43 base64url chars, the RFC minimum
const STATE_BYTES = 16;

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(VERIFIER_BYTES)));
}

export function generateState(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(STATE_BYTES)));
}

export async function deriveChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function buildAuthorizeUrl(
  provider: PkceProvider,
  params: { challenge: string; state: string; redirect: string },
): string {
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set('client_id', provider.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('code_challenge', params.challenge);
  // S256 only. `plain` is permitted by the RFC and is worthless here.
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('redirect_uri', params.redirect);
  url.searchParams.set('scope', provider.scopes.join(' '));
  url.searchParams.set('state', params.state);
  for (const [k, v] of Object.entries(provider.extraAuthParams ?? {})) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

/**
 * Validates the redirect and extracts the authorization code.
 *
 * State is checked first and unconditionally: an attacker who can shape the
 * callback could otherwise steer us into an error branch and learn which
 * failure we hit.
 */
export function parseCallback(callbackUrl: string, expectedState: string): string {
  const params = new URL(callbackUrl).searchParams;

  const returnedState = params.get('state');
  if (returnedState !== expectedState) {
    throw new Error('OAUTH_STATE_MISMATCH');
  }

  const error = params.get('error');
  if (error) {
    const description = params.get('error_description');
    throw new Error(description ? `${error}: ${description}` : error);
  }

  const code = params.get('code');
  if (!code) throw new Error('OAUTH_NO_CODE');
  return code;
}

export async function exchangeCodeForTokens(
  provider: PkceProvider,
  opts: {
    code: string;
    verifier: string;
    redirect: string;
    fetchImpl?: typeof fetch;
    now?: () => Date;
  },
): Promise<TokenSet> {
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => new Date());

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: opts.code,
    code_verifier: opts.verifier,
    redirect_uri: opts.redirect,
    client_id: provider.clientId,
  });
  // Deliberately no client_secret: this is a public client.

  const res = await doFetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`OAUTH_TOKEN_EXCHANGE_FAILED: ${res.status}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  if (!json.access_token) {
    throw new Error('OAUTH_TOKEN_EXCHANGE_FAILED: response contained no access_token');
  }

  const expiresInSec = json.expires_in ?? 3600;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(now().getTime() + expiresInSec * 1000).toISOString(),
    scope: json.scope,
    tokenType: json.token_type ?? 'Bearer',
  };
}

export class OAuthRefreshRevoked extends Error {
  constructor() {
    super('OAUTH_REFRESH_REVOKED');
    this.name = 'OAuthRefreshRevoked';
  }
}

/**
 * Exchange a refresh token for a fresh access token.
 *
 * A 400 with `invalid_grant` means the user revoked access (or the token
 * expired after long disuse). That is unrecoverable without re-consent, so it
 * gets its own error type — callers must clear the grant rather than retry.
 */
export async function refreshAccessToken(
  provider: PkceProvider,
  opts: { refreshToken: string; fetchImpl?: typeof fetch; now?: () => Date },
): Promise<TokenSet> {
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => new Date());

  const res = await doFetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: opts.refreshToken,
      client_id: provider.clientId,
    }).toString(),
  });

  if (res.status === 400 || res.status === 401) throw new OAuthRefreshRevoked();
  if (!res.ok) throw new Error(`OAUTH_REFRESH_FAILED: ${res.status}`);

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!json.access_token) throw new Error('OAUTH_REFRESH_FAILED: response contained no token');

  return {
    accessToken: json.access_token,
    // Google usually omits this on refresh; keep the existing one in that case.
    refreshToken: json.refresh_token,
    expiresAt: new Date(now().getTime() + (json.expires_in ?? 3600) * 1000).toISOString(),
    scope: json.scope,
    tokenType: json.token_type ?? 'Bearer',
  };
}

export async function startPkceFlow(provider: PkceProvider, deps: PkceFlowDeps): Promise<TokenSet> {
  const verifier = generateVerifier();
  const challenge = await deriveChallenge(verifier);
  const state = generateState();
  const redirect = deps.getRedirectURL();

  const callbackUrl = await deps.launchWebAuthFlow({
    url: buildAuthorizeUrl(provider, { challenge, state, redirect }),
    interactive: true,
  });

  const code = parseCallback(callbackUrl, state);

  return exchangeCodeForTokens(provider, {
    code,
    verifier,
    redirect,
    fetchImpl: deps.fetchImpl,
    now: deps.now,
  });
}
