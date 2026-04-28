import { z } from 'zod';

export const EncryptedSecretSchema = z.object({
  v: z.literal(1),
  algo: z.literal('AES-GCM-256'),
  kdf: z.literal('PBKDF2-SHA256-250k'),
  salt: z.string(),
  iv: z.string(),
  ct: z.string(),
  createdAt: z.string(),
});
export type EncryptedSecret = z.infer<typeof EncryptedSecretSchema>;

const KDF = { name: 'PBKDF2', hash: 'SHA-256', iterations: 250_000 } as const;
const CIPHER = { name: 'AES-GCM', length: 256 } as const;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function b64encode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { ...KDF, salt: salt as BufferSource },
    baseKey,
    { name: CIPHER.name, length: CIPHER.length },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedSecret> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: CIPHER.name, iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext) as BufferSource,
  );
  return {
    v: 1,
    algo: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256-250k',
    salt: b64encode(salt),
    iv: b64encode(iv),
    ct: b64encode(ct),
    createdAt: new Date().toISOString(),
  };
}

export async function decrypt(env: EncryptedSecret, passphrase: string): Promise<string> {
  if (env.v !== 1) throw new Error(`Unsupported envelope version: ${env.v}`);
  const salt = b64decode(env.salt);
  const iv = b64decode(env.iv);
  const ct = b64decode(env.ct);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt(
    { name: CIPHER.name, iv: iv as BufferSource },
    key,
    ct as BufferSource,
  );
  return new TextDecoder().decode(pt);
}
