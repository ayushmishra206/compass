import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AccentName, Density, Theme } from '@compass/ui';

/** Discriminator for which fullscreen/portal overlay is currently mounted. */
export type OverlayKind =
  | null
  | 'focusRunning'
  | 'blockOverlay'
  | 'onboarding'
  | 'decompose'
  | 'draft'
  | 'cmdK'
  | 'tweaks';

export interface ShellState {
  theme: Theme;
  accent: AccentName;
  density: Density;
  overlay: OverlayKind;
  overlayPayload: unknown;
  tweaksOpen: boolean;
  setTheme: (t: Theme) => void;
  setAccent: (a: AccentName) => void;
  setDensity: (d: Density) => void;
  openOverlay: (kind: Exclude<OverlayKind, null>, payload?: unknown) => void;
  closeOverlay: () => void;
  setTweaksOpen: (v: boolean) => void;
}

/**
 * Global shell store. Only `{theme, accent, density}` persist — overlay and
 * tweaks-open flags are transient.
 */
export const useShell = create<ShellState>()(
  persist(
    (set) => ({
      theme: 'light',
      accent: 'terracotta',
      density: 'spacious',
      overlay: null,
      overlayPayload: undefined,
      tweaksOpen: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      openOverlay: (overlay, overlayPayload) => set({ overlay, overlayPayload }),
      closeOverlay: () => set({ overlay: null, overlayPayload: undefined }),
      setTweaksOpen: (tweaksOpen) => set({ tweaksOpen }),
    }),
    {
      name: 'compass-shell',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, accent: s.accent, density: s.density }),
    },
  ),
);
