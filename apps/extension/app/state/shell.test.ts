import { beforeEach, describe, expect, it } from 'vitest';
import { useShell } from './shell.js';

describe('shell store', () => {
  beforeEach(() => {
    localStorage.clear();
    useShell.setState({
      theme: 'light',
      accent: 'terracotta',
      density: 'spacious',
      overlay: null,
      overlayPayload: undefined,
      tweaksOpen: false,
    });
  });

  it('defaults', () => {
    const s = useShell.getState();
    expect(s.theme).toBe('light');
    expect(s.accent).toBe('terracotta');
    expect(s.density).toBe('spacious');
    expect(s.overlay).toBeNull();
  });

  it('setTheme updates state + persists', () => {
    useShell.getState().setTheme('dark');
    expect(useShell.getState().theme).toBe('dark');
    const raw = localStorage.getItem('compass-shell');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.theme).toBe('dark');
  });

  it('openOverlay + closeOverlay', () => {
    useShell.getState().openOverlay('cmdK');
    expect(useShell.getState().overlay).toBe('cmdK');
    useShell.getState().closeOverlay();
    expect(useShell.getState().overlay).toBeNull();
  });

  it('tweaksOpen toggles but is not persisted', () => {
    useShell.getState().setTweaksOpen(true);
    expect(useShell.getState().tweaksOpen).toBe(true);
    const persisted = JSON.parse(localStorage.getItem('compass-shell')!);
    expect(persisted.state.tweaksOpen).toBeUndefined();
  });
});
