import type { PkceProvider } from './pkce';

/**
 * Provider configurations per PRD §7.4.
 *
 * `clientId` is a per-install value (each developer registers their own OAuth
 * client), so these are factories rather than constants — nothing here is a
 * secret, but nothing here is a shared default either.
 */

/**
 * Google, read-only Calendar.
 *
 * Least privilege per invariant 4: `calendar.readonly` only. Gmail scopes are
 * added incrementally in a later phase so this consent screen never enters
 * restricted-scope territory (and therefore needs no CASA review for a
 * testing-mode alpha).
 *
 * `access_type=offline` + `prompt=consent` are what make Google return a
 * refresh token; without both, only the first-ever authorization yields one.
 */
export function googleCalendarProvider(clientId: string): PkceProvider {
  return {
    id: 'google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  };
}

/** OpenRouter — PRD §7.2 option C, "one-click sign-in". Returns a BYOK key. */
export function openRouterProvider(clientId: string): PkceProvider {
  return {
    id: 'openrouter',
    authorizeUrl: 'https://openrouter.ai/auth',
    tokenUrl: 'https://openrouter.ai/api/v1/auth/keys',
    clientId,
    scopes: ['offline_access'],
  };
}
