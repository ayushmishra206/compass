import { rpc } from '@compass/runtime';
import { UserProfileSchema, type UserProfile } from '../types/user';

const STORAGE_KEY = 'profile.user.v1';

export async function getUserProfile(): Promise<UserProfile> {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = UserProfileSchema.safeParse(r[STORAGE_KEY]);
  if (parsed.success) return parsed.data;

  const fresh: UserProfile = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US',
    workHours: { start: '09:00', end: '17:00' },
    briefingHour: 8,
    reflectionHour: 18,
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
  return fresh;
}

export async function setUserProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile();
  const next = UserProfileSchema.parse({ ...current, ...patch });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  if (patch.briefingHour !== undefined || patch.reflectionHour !== undefined) {
    // Best-effort fire-and-forget; tolerate route not being declared yet
    try {
      await rpc('alarms.refresh' as never, {} as never);
    } catch {
      // Route may not exist yet during incremental rollout
    }
  }
  return next;
}
