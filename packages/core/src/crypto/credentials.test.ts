import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getActiveCredentials,
  setActiveCredentials,
  clearActiveCredentials,
  LlmCredentialsLocked,
} from './credentials';
import { encrypt } from './keystore';

beforeEach(() => {
  const store: Record<string, unknown> = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
        }),
        remove: vi.fn(async (key: string) => {
          delete store[key];
        }),
      },
    },
  });
});

describe('getActiveCredentials / setActiveCredentials', () => {
  it('returns { default: null } when storage is empty', async () => {
    expect(await getActiveCredentials()).toEqual({ default: null });
  });

  it('round-trips a Phase-1 OpenRouter set', async () => {
    await setActiveCredentials({
      default: 'openrouter',
      openrouter: { apiKey: 'sk-or-v1-test', addedAt: '2026-04-26T10:00:00Z' },
    });
    const out = await getActiveCredentials();
    expect(out.default).toBe('openrouter');
    expect(out.openrouter?.apiKey).toBe('sk-or-v1-test');
  });

  it('returns default when stored data is malformed', async () => {
    // Manually plant a malformed value
    await chrome.storage.local.set({ 'llm.creds.v1': { invalid: 'shape' } });
    expect(await getActiveCredentials()).toEqual({ default: null });
  });

  it('clearActiveCredentials removes the entry', async () => {
    await setActiveCredentials({
      default: 'openrouter',
      openrouter: { apiKey: 'k', addedAt: '2026-04-26T10:00:00Z' },
    });
    await clearActiveCredentials();
    expect(await getActiveCredentials()).toEqual({ default: null });
  });
});

interface ChromeStorage {
  local: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  session: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
}

function installChromeStorageMock(): ChromeStorage {
  const localStore = new Map<string, unknown>();
  const sessionStore = new Map<string, unknown>();
  const mock: ChromeStorage = {
    local: {
      get: vi.fn(async (key: string) =>
        localStore.has(key) ? { [key]: localStore.get(key) } : {},
      ),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) localStore.set(k, v);
      }),
      remove: vi.fn(async (key: string) => {
        localStore.delete(key);
      }),
    },
    session: {
      get: vi.fn(async (key: string) =>
        sessionStore.has(key) ? { [key]: sessionStore.get(key) } : {},
      ),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) sessionStore.set(k, v);
      }),
      remove: vi.fn(async (key: string) => {
        sessionStore.delete(key);
      }),
    },
  };
  (globalThis as unknown as { chrome: { storage: ChromeStorage } }).chrome = { storage: mock };
  return mock;
}

describe('LlmCredentialsLocked', () => {
  it('is an Error subclass with the expected name', () => {
    const e = new LlmCredentialsLocked();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('LlmCredentialsLocked');
    expect(e.message).toMatch(/encrypted/i);
  });
});

describe('getActiveCredentials — shape detection', () => {
  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('returns { default: null } when storage is empty', async () => {
    installChromeStorageMock();
    const creds = await getActiveCredentials();
    expect(creds).toEqual({ default: null });
  });

  it('returns raw creds when storage holds raw shape', async () => {
    const mock = installChromeStorageMock();
    await mock.local.set({
      'llm.creds.v1': {
        default: 'openrouter',
        openrouter: {
          apiKey: 'sk-or-test',
          addedAt: '2026-05-09T10:00:00Z',
          lastValidatedAt: '2026-05-09T10:00:00Z',
        },
      },
    });
    const creds = await getActiveCredentials();
    expect(creds.default).toBe('openrouter');
    expect(creds.openrouter?.apiKey).toBe('sk-or-test');
  });

  it('throws LlmCredentialsLocked when storage holds envelope and session is empty', async () => {
    const mock = installChromeStorageMock();
    const envelope = await encrypt(JSON.stringify({ default: null }), 'a-test-passphrase');
    await mock.local.set({ 'llm.creds.v1': envelope });
    await expect(getActiveCredentials()).rejects.toBeInstanceOf(LlmCredentialsLocked);
  });

  it('decrypts envelope and returns creds when session has cached passphrase', async () => {
    const mock = installChromeStorageMock();
    const passphrase = 'a-test-passphrase-12c';
    const original = {
      default: 'openai',
      openai: {
        apiKey: 'sk-openai-test',
        addedAt: '2026-05-09T10:00:00Z',
        lastValidatedAt: '2026-05-09T10:00:00Z',
      },
    };
    const envelope = await encrypt(JSON.stringify(original), passphrase);
    await mock.local.set({ 'llm.creds.v1': envelope });
    await mock.session.set({ 'llm.creds.v1.kek': passphrase });
    const creds = await getActiveCredentials();
    expect(creds.default).toBe('openai');
    expect(creds.openai?.apiKey).toBe('sk-openai-test');
  });
});

import { EncryptedSecretSchema } from './keystore';
import { enableEncryption, disableEncryption } from './credentials';

describe('setActiveCredentials — shape-aware', () => {
  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('writes raw shape when storage is empty', async () => {
    const mock = installChromeStorageMock();
    const creds = {
      default: 'openrouter' as const,
      openrouter: { apiKey: 'sk-or-1', addedAt: 't', lastValidatedAt: 't' },
    };
    await setActiveCredentials(creds);
    const stored = (await mock.local.get('llm.creds.v1'))['llm.creds.v1'];
    expect(stored).toEqual(creds);
  });

  it('writes raw shape when storage already holds raw', async () => {
    const mock = installChromeStorageMock();
    await mock.local.set({ 'llm.creds.v1': { default: null } });
    const creds = {
      default: 'openai' as const,
      openai: { apiKey: 'sk-oa-1', addedAt: 't', lastValidatedAt: 't' },
    };
    await setActiveCredentials(creds);
    const stored = (await mock.local.get('llm.creds.v1'))['llm.creds.v1'];
    expect(stored).toEqual(creds);
    expect(EncryptedSecretSchema.safeParse(stored).success).toBe(false);
  });

  it('re-encrypts and writes envelope when storage holds envelope and session has passphrase', async () => {
    const mock = installChromeStorageMock();
    const passphrase = 'a-test-passphrase-12c';
    const initial = await encrypt(JSON.stringify({ default: null }), passphrase);
    await mock.local.set({ 'llm.creds.v1': initial });
    await mock.session.set({ 'llm.creds.v1.kek': passphrase });

    const creds = {
      default: 'anthropic' as const,
      anthropic: { apiKey: 'sk-ant-1', addedAt: 't', lastValidatedAt: 't' },
    };
    await setActiveCredentials(creds);

    const stored = (await mock.local.get('llm.creds.v1'))['llm.creds.v1'];
    expect(EncryptedSecretSchema.safeParse(stored).success).toBe(true);
  });

  it('throws LlmCredentialsLocked when storage holds envelope but session is empty', async () => {
    const mock = installChromeStorageMock();
    const initial = await encrypt(JSON.stringify({ default: null }), 'a-test-passphrase-12c');
    await mock.local.set({ 'llm.creds.v1': initial });

    const creds = {
      default: 'openrouter' as const,
      openrouter: { apiKey: 'sk-or-1', addedAt: 't', lastValidatedAt: 't' },
    };
    await expect(setActiveCredentials(creds)).rejects.toBeInstanceOf(LlmCredentialsLocked);
  });
});

describe('enableEncryption', () => {
  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('encrypts existing raw creds and caches passphrase', async () => {
    const mock = installChromeStorageMock();
    const initial = {
      default: 'openrouter' as const,
      openrouter: { apiKey: 'sk-or-1', addedAt: 't', lastValidatedAt: 't' },
    };
    await mock.local.set({ 'llm.creds.v1': initial });

    await enableEncryption('a-test-passphrase-12c');

    const stored = (await mock.local.get('llm.creds.v1'))['llm.creds.v1'];
    expect(EncryptedSecretSchema.safeParse(stored).success).toBe(true);
    const cached = (await mock.session.get('llm.creds.v1.kek'))['llm.creds.v1.kek'];
    expect(cached).toBe('a-test-passphrase-12c');
  });

  it('encrypts default-null creds when storage was empty', async () => {
    const mock = installChromeStorageMock();
    await enableEncryption('a-test-passphrase-12c');
    const stored = (await mock.local.get('llm.creds.v1'))['llm.creds.v1'];
    expect(EncryptedSecretSchema.safeParse(stored).success).toBe(true);
  });

  it('throws when storage already holds an envelope', async () => {
    const mock = installChromeStorageMock();
    const initial = await encrypt(JSON.stringify({ default: null }), 'p1234567890ab');
    await mock.local.set({ 'llm.creds.v1': initial });

    await expect(enableEncryption('p2234567890ab')).rejects.toThrow(/already encrypted/i);
  });
});

describe('disableEncryption', () => {
  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('decrypts envelope, writes raw, removes session cache', async () => {
    const mock = installChromeStorageMock();
    const passphrase = 'a-test-passphrase-12c';
    const original = {
      default: 'openai' as const,
      openai: { apiKey: 'sk-oa-1', addedAt: 't', lastValidatedAt: 't' },
    };
    const envelope = await encrypt(JSON.stringify(original), passphrase);
    await mock.local.set({ 'llm.creds.v1': envelope });
    await mock.session.set({ 'llm.creds.v1.kek': passphrase });

    await disableEncryption(passphrase);

    const stored = (await mock.local.get('llm.creds.v1'))['llm.creds.v1'];
    expect(stored).toEqual(original);
    const cached = (await mock.session.get('llm.creds.v1.kek'))['llm.creds.v1.kek'];
    expect(cached).toBeUndefined();
  });

  it('throws on wrong passphrase', async () => {
    const mock = installChromeStorageMock();
    const passphrase = 'a-test-passphrase-12c';
    const envelope = await encrypt(JSON.stringify({ default: null }), passphrase);
    await mock.local.set({ 'llm.creds.v1': envelope });

    await expect(disableEncryption('wrong-passphrase-9c')).rejects.toThrow();
  });

  it('throws when storage is not currently encrypted', async () => {
    const mock = installChromeStorageMock();
    await mock.local.set({ 'llm.creds.v1': { default: null } });
    await expect(disableEncryption('a-test-passphrase-12c')).rejects.toThrow(
      /not currently encrypted/i,
    );
  });
});
