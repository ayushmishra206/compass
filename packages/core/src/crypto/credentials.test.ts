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
