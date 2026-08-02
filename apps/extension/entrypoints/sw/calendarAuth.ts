import {
  googleCalendarProvider,
  googleInboxProvider,
  startPkceFlow,
  type PkceFlowDeps,
} from '@compass/integrations';
import { setOAuthGrant } from '@compass/core';

/**
 * Service-worker side of the Google connect flow.
 *
 * This lives in the SW because `identity.launchWebAuthFlow` is not available
 * to the offscreen document, and because PRD §7.4 requires the flow be driven
 * from a context that cannot be dismissed mid-flight the way a popup can.
 */

const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

async function fetchEmail(
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<string | undefined> {
  try {
    const res = await fetchImpl(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { email?: string };
    return json.email;
  } catch {
    // The address is a convenience for the Profile drawer and for matching
    // "self" on attendee lists. Losing it must not fail the connect.
    return undefined;
  }
}

export interface ConnectResult {
  ok: boolean;
  email?: string;
  error?: string;
}

export async function connectGoogleCalendar(
  clientId: string,
  deps: Partial<PkceFlowDeps> & { fetchImpl?: typeof fetch } = {},
): Promise<ConnectResult> {
  return connectGoogle(googleCalendarProvider, clientId, deps);
}

/** Same flow, adding the read-only Gmail scope as an incremental grant. */
export async function connectGoogleInbox(
  clientId: string,
  deps: Partial<PkceFlowDeps> & { fetchImpl?: typeof fetch } = {},
): Promise<ConnectResult> {
  return connectGoogle(googleInboxProvider, clientId, deps);
}

async function connectGoogle(
  makeProvider: (clientId: string) => ReturnType<typeof googleCalendarProvider>,
  clientId: string,
  deps: Partial<PkceFlowDeps> & { fetchImpl?: typeof fetch } = {},
): Promise<ConnectResult> {
  const trimmed = clientId.trim();
  if (!trimmed) return { ok: false, error: 'A Google OAuth client ID is required.' };

  const fetchImpl = deps.fetchImpl ?? fetch;
  const provider = makeProvider(trimmed);

  try {
    const tokens = await startPkceFlow(provider, {
      launchWebAuthFlow:
        deps.launchWebAuthFlow ??
        (async (opts) => {
          const callback = await chrome.identity.launchWebAuthFlow({
            url: opts.url,
            interactive: true,
          });
          // Chrome resolves undefined when the user closes the window rather
          // than declining, which would otherwise surface as a parse failure.
          if (!callback) throw new Error('access_denied');
          return callback;
        }),
      getRedirectURL: deps.getRedirectURL ?? (() => chrome.identity.getRedirectURL()),
      fetchImpl,
      now: deps.now,
    });

    if (!tokens.refreshToken) {
      // Without a refresh token every sync would need a fresh consent prompt.
      // Google only withholds it when a prior grant is still live, so the fix
      // is to revoke at myaccount.google.com and connect again.
      return {
        ok: false,
        error:
          'Google did not return a refresh token. Remove Compass at myaccount.google.com/permissions, then connect again.',
      };
    }

    const email = await fetchEmail(tokens.accessToken, fetchImpl);

    await setOAuthGrant({
      provider: 'google',
      refreshToken: tokens.refreshToken,
      scope: tokens.scope ?? provider.scopes.join(' '),
      email,
      grantedAt: new Date().toISOString(),
    });

    return { ok: true, email };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('OAUTH_STATE_MISMATCH')) {
      return { ok: false, error: 'Sign-in could not be verified. Please try again.' };
    }
    if (message.includes('access_denied')) {
      return { ok: false, error: 'Access was declined at the Google consent screen.' };
    }
    return { ok: false, error: message };
  }
}
