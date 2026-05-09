import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccentName } from '@compass/ui';
import type { Mood } from '@compass/core';
import { isEncryptionEnabled, isLocked, unlockCredentials, lockCredentials } from '@compass/core';

export type DrawerKind =
  | 'brief'
  | 'today'
  | 'goals'
  | 'notes'
  | 'inbox'
  | 'focus'
  | 'profile'
  | 'onboarding';

export interface ShellState {
  drawer: { open: boolean; kind: DrawerKind | null };
  cmdkOpen: boolean;
  onboardingLocked: boolean;
  pinnedScene: Mood | null;
  accent: AccentName;
  weatherEnabled: boolean;
  encryptionEnabled: boolean;
  locked: boolean;
  unlockHint: boolean;

  navClick: (kind: DrawerKind) => void;
  avatarClick: () => void;
  scrimClick: () => void;
  esc: () => void;
  cmdkHotkey: () => void;
  byokSetupComplete: () => void;
  setAccent: (a: AccentName) => void;
  setPinnedScene: (m: Mood | null) => void;
  setWeatherEnabled: (b: boolean) => void;
  closeDrawer: () => void;
  closeCmdk: () => void;
  refreshLockState: () => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => Promise<void>;
  requestUnlock: () => void;
  setEncryptionState: (enabled: boolean, locked: boolean) => void;
  clearUnlockHint: () => void;
}

export const useShell = create<ShellState>()(
  persist(
    (set, get) => ({
      drawer: { open: false, kind: null },
      cmdkOpen: false,
      onboardingLocked: false,
      pinnedScene: null,
      accent: 'amber',
      weatherEnabled: false,
      encryptionEnabled: false,
      locked: false,
      unlockHint: false,

      navClick: (kind) => set({ drawer: { open: true, kind } }),
      avatarClick: () => {
        const locked = get().onboardingLocked;
        set({ drawer: { open: true, kind: locked ? 'onboarding' : 'profile' } });
      },
      scrimClick: () => {
        if (get().onboardingLocked) return;
        set((s) => ({ drawer: { ...s.drawer, open: false } }));
      },
      esc: () => {
        if (get().onboardingLocked) {
          set({ cmdkOpen: false });
          return;
        }
        set((s) => ({ drawer: { ...s.drawer, open: false }, cmdkOpen: false }));
      },
      cmdkHotkey: () => set((s) => ({ cmdkOpen: !s.cmdkOpen })),
      byokSetupComplete: () =>
        set({ onboardingLocked: false, drawer: { open: false, kind: null } }),
      setAccent: (a) => set({ accent: a }),
      setPinnedScene: (m) => set({ pinnedScene: m }),
      setWeatherEnabled: (b) => set({ weatherEnabled: b }),
      closeDrawer: () => set((s) => ({ drawer: { ...s.drawer, open: false } })),
      closeCmdk: () => set({ cmdkOpen: false }),

      refreshLockState: async () => {
        const [enabled, locked] = await Promise.all([isEncryptionEnabled(), isLocked()]);
        set({ encryptionEnabled: enabled, locked });
      },

      unlock: async (passphrase: string) => {
        await unlockCredentials(passphrase);
        set({ locked: false, unlockHint: false });
      },

      lock: async () => {
        await lockCredentials();
        set({ locked: true });
      },

      requestUnlock: () => set({ drawer: { open: true, kind: 'profile' }, unlockHint: true }),

      setEncryptionState: (enabled, locked) => set({ encryptionEnabled: enabled, locked }),

      clearUnlockHint: () => set({ unlockHint: false }),
    }),
    {
      name: 'compass.shell.v1',
      partialize: (s) => ({
        accent: s.accent,
        pinnedScene: s.pinnedScene,
        weatherEnabled: s.weatherEnabled,
        // intentionally NOT: encryptionEnabled, locked, unlockHint (re-derived on boot)
      }),
    },
  ),
);
