import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn(async () => ({ ok: true })) }));

interface ChromeStorage {
  local: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
}

function installChromeStorageMock(): ChromeStorage {
  const store = new Map<string, unknown>();
  const mock: ChromeStorage = {
    local: {
      get: vi.fn(async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {})),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) store.set(k, v);
      }),
      remove: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
  (globalThis as unknown as { chrome: { storage: ChromeStorage } }).chrome = { storage: mock };
  return mock;
}

import { getUserProfile, setUserProfile } from './userProfile';

describe('UserProfile', () => {
  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('creates a default profile on first call when storage is empty', async () => {
    installChromeStorageMock();
    const profile = await getUserProfile();
    expect(profile.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(profile.briefingHour).toBe(8);
    expect(profile.reflectionHour).toBe(18);
    expect(profile.workHours.start).toBe('09:00');
    expect(profile.workHours.end).toBe('17:00');
    expect(profile.timezone).toBeTruthy();
    expect(profile.locale).toBeTruthy();
  });

  it('returns the persisted profile on subsequent calls', async () => {
    installChromeStorageMock();
    const first = await getUserProfile();
    const second = await getUserProfile();
    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
  });

  it('setUserProfile patches the stored profile', async () => {
    installChromeStorageMock();
    await getUserProfile();
    const updated = await setUserProfile({ briefingHour: 9 });
    expect(updated.briefingHour).toBe(9);
    const fetched = await getUserProfile();
    expect(fetched.briefingHour).toBe(9);
  });

  it('setUserProfile validates against UserProfileSchema', async () => {
    installChromeStorageMock();
    await getUserProfile();
    await expect(setUserProfile({ briefingHour: 'invalid' as never })).rejects.toThrow();
  });
});
