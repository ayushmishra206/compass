import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, EncryptedSecretSchema } from './keystore';

const PASSPHRASE = 'correct horse battery staple';

describe('keystore — WebCrypto envelope', () => {
  it('round-trips a secret', async () => {
    const env = await encrypt('my-key', PASSPHRASE);
    expect(EncryptedSecretSchema.safeParse(env).success).toBe(true);
    const out = await decrypt(env, PASSPHRASE);
    expect(out).toBe('my-key');
  });

  it('produces a different IV per encryption', async () => {
    const a = await encrypt('s', PASSPHRASE);
    const b = await encrypt('s', PASSPHRASE);
    expect(a.iv).not.toBe(b.iv);
  });

  it('rejects wrong passphrase', async () => {
    const env = await encrypt('s', PASSPHRASE);
    await expect(decrypt(env, 'wrong')).rejects.toThrow();
  });

  it('rejects unknown schema version', async () => {
    const env = await encrypt('s', PASSPHRASE);
    const tampered = { ...env, v: 99 as const };
    await expect(decrypt(tampered as never, PASSPHRASE)).rejects.toThrow(/version/i);
  });
});
