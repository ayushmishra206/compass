import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccentName } from '@compass/ui';
import type { Mood } from '@compass/core';

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
    }),
    {
      name: 'compass.shell.v1',
      partialize: (s) => ({
        accent: s.accent,
        pinnedScene: s.pinnedScene,
        weatherEnabled: s.weatherEnabled,
      }),
    },
  ),
);
