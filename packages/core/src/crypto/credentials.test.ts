import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveCredentials, setActiveCredentials, clearActiveCredentials } from './credentials';

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
