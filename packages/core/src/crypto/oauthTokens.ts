import { EncryptedSecretSchema, encrypt, decrypt } from './keystore';

/**
 * OAuth grant storage, per PRD §7.3.
 *
 * Refresh tokens are long-lived bearer credentials, so they go through the
 * same EncryptedSecret envelope as LLM keys and share its cached passphrase.
 * Access tokens are short-lived and go to `chrome.storage.session` only, which
 * the browser drops when the session ends.
 */

const GRANTS_KEY = 'oauth.grants.v1';
const ACCESS_KEY = 'oauth.access.v1';
/** Plaintext list of connected providers — no secrets, readable while locked. */
const CONNECTED_KEY = 'oauth.connected.v1';
const SESSION_KEK_KEY = 'llm.creds.v1.kek';

/**
 * Treat a token as expired this many ms early, so one that would die
 * mid-flight is refreshed before the request rather than during it.
 */
const EXPIRY_SKEW_MS = 60_000;

export type OAuthProviderId = 'google' | 'openrouter';

export interface OAuthGrant {
  provider: OAuthProviderId;
  refreshToken: string;
  scope: string;
  email?: string;
  grantedAt: string;
}

type GrantMap = Partial<Record<OAuthProviderId, OAuthGrant>>;

export class OAuthGrantLocked extends Error {
  constructor() {
    super('OAuth grants are encrypted; unlock credentials first');
    this.name = 'OAuthGrantLocked';
  }
}

async function cachedPassphrase(): Promise<string | null> {
  const r = await chrome.storage.session.get(SESSION_KEK_KEY);
  const v = r[SESSION_KEK_KEY];
  return typeof v === 'string' ? v : null;
}

async function readGrants(): Promise<GrantMap> {
  const raw = await chrome.storage.local.get(GRANTS_KEY);
  const value = raw[GRANTS_KEY];
  if (!value) return {};

  const env = EncryptedSecretSchema.safeParse(value);
  if (env.success) {
    const passphrase = await cachedPassphrase();
    if (!passphrase) throw new OAuthGrantLocked();
    return JSON.parse(await decrypt(env.data, passphrase)) as GrantMap;
  }
  return value as GrantMap;
}

async function writeGrants(map: GrantMap): Promise<void> {
  const existing = await chrome.storage.local.get(GRANTS_KEY);
  const wasEncrypted = EncryptedSecretSchema.safeParse(existing[GRANTS_KEY]).success;

  if (wasEncrypted) {
    const passphrase = await cachedPassphrase();
    if (!passphrase) throw new OAuthGrantLocked();
    await chrome.storage.local.set({
      [GRANTS_KEY]: await encrypt(JSON.stringify(map), passphrase),
    });
  } else {
    await chrome.storage.local.set({ [GRANTS_KEY]: map });
  }

  await chrome.storage.local.set({ [CONNECTED_KEY]: Object.keys(map) });
}

export async function getOAuthGrant(provider: OAuthProviderId): Promise<OAuthGrant | null> {
  return (await readGrants())[provider] ?? null;
}

export async function setOAuthGrant(grant: OAuthGrant): Promise<void> {
  // Read before write so a locked store rejects before anything is persisted.
  const map = await readGrants();
  map[grant.provider] = grant;
  await writeGrants(map);
}

export async function clearOAuthGrant(provider: OAuthProviderId): Promise<void> {
  const map = await readGrants();
  delete map[provider];
  await writeGrants(map);

  const session = await chrome.storage.session.get(ACCESS_KEY);
  const tokens = (session[ACCESS_KEY] ?? {}) as Record<string, unknown>;
  delete tokens[provider];
  await chrome.storage.session.set({ [ACCESS_KEY]: tokens });
}

/**
 * Whether a provider is connected. Reads the plaintext index so the UI can
 * render connection state while the encrypted store is still locked.
 */
export async function hasOAuthGrant(provider: OAuthProviderId): Promise<boolean> {
  const raw = await chrome.storage.local.get(CONNECTED_KEY);
  const list = raw[CONNECTED_KEY];
  return Array.isArray(list) && list.includes(provider);
}

export async function setAccessToken(
  provider: OAuthProviderId,
  token: string,
  expiresAt: string,
): Promise<void> {
  const session = await chrome.storage.session.get(ACCESS_KEY);
  const tokens = (session[ACCESS_KEY] ?? {}) as Record<string, unknown>;
  tokens[provider] = { token, expiresAt };
  await chrome.storage.session.set({ [ACCESS_KEY]: tokens });
}

export async function getAccessToken(
  provider: OAuthProviderId,
  now: Date = new Date(),
): Promise<string | null> {
  const session = await chrome.storage.session.get(ACCESS_KEY);
  const tokens = (session[ACCESS_KEY] ?? {}) as Record<
    string,
    { token: string; expiresAt: string } | undefined
  >;
  const entry = tokens[provider];
  if (!entry) return null;

  const expiresMs = new Date(entry.expiresAt).getTime();
  if (Number.isNaN(expiresMs) || now.getTime() >= expiresMs - EXPIRY_SKEW_MS) return null;
  return entry.token;
}
