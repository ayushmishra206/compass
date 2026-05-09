import { LlmCredentialsSchema, type LlmCredentials } from '../types/credentials';
import { EncryptedSecretSchema, encrypt, decrypt } from './keystore';

const STORAGE_KEY = 'llm.creds.v1';
const SESSION_KEK_KEY = 'llm.creds.v1.kek';

export class LlmCredentialsLocked extends Error {
  constructor() {
    super('Credentials are encrypted; call unlockCredentials() first');
    this.name = 'LlmCredentialsLocked';
  }
}

async function getCachedPassphrase(): Promise<string | null> {
  const r = await chrome.storage.session.get(SESSION_KEK_KEY);
  const v = r[SESSION_KEK_KEY];
  return typeof v === 'string' ? v : null;
}

export async function getActiveCredentials(): Promise<LlmCredentials> {
  const raw = await chrome.storage.local.get(STORAGE_KEY);
  const value = raw[STORAGE_KEY];
  if (!value) return { default: null };

  // Try encrypted envelope first
  const env = EncryptedSecretSchema.safeParse(value);
  if (env.success) {
    const passphrase = await getCachedPassphrase();
    if (!passphrase) throw new LlmCredentialsLocked();
    const plaintext = await decrypt(env.data, passphrase);
    return LlmCredentialsSchema.parse(JSON.parse(plaintext));
  }

  // Fall through to raw shape
  const rawParsed = LlmCredentialsSchema.safeParse(value);
  return rawParsed.success ? rawParsed.data : { default: null };
}

export async function setActiveCredentials(creds: LlmCredentials): Promise<void> {
  const validated = LlmCredentialsSchema.parse(creds);
  const existing = await chrome.storage.local.get(STORAGE_KEY);
  const env = EncryptedSecretSchema.safeParse(existing[STORAGE_KEY]);
  if (env.success) {
    const passphrase = await getCachedPassphrase();
    if (!passphrase) throw new LlmCredentialsLocked();
    const envelope = await encrypt(JSON.stringify(validated), passphrase);
    await chrome.storage.local.set({ [STORAGE_KEY]: envelope });
  } else {
    await chrome.storage.local.set({ [STORAGE_KEY]: validated });
  }
}

export async function clearActiveCredentials(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
