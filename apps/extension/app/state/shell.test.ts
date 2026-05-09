import { describe, it, expect, beforeEach } from 'vitest';
import { useShell } from './shell.js';

describe('useShell store', () => {
  beforeEach(() => {
    useShell.setState({
      drawer: { open: false, kind: null },
      cmdkOpen: false,
      onboardingLocked: false,
      pinnedScene: null,
      accent: 'amber',
      weatherEnabled: false,
    });
  });

  it('navClick opens the requested drawer kind', () => {
    useShell.getState().navClick('brief');
    expect(useShell.getState().drawer).toEqual({ open: true, kind: 'brief' });
  });

  it('avatarClick opens "profile" by default and "onboarding" when locked', () => {
    useShell.getState().avatarClick();
    expect(useShell.getState().drawer.kind).toBe('profile');

    useShell.setState({ onboardingLocked: true });
    useShell.getState().avatarClick();
    expect(useShell.getState().drawer.kind).toBe('onboarding');
  });

  it('scrimClick is a no-op while onboardingLocked', () => {
    useShell.setState({
      onboardingLocked: true,
      drawer: { open: true, kind: 'onboarding' },
    });
    useShell.getState().scrimClick();
    expect(useShell.getState().drawer.open).toBe(true);
  });

  it('esc closes drawer + cmdk when unlocked', () => {
    useShell.setState({
      drawer: { open: true, kind: 'brief' },
      cmdkOpen: true,
    });
    useShell.getState().esc();
    expect(useShell.getState().drawer.open).toBe(false);
    expect(useShell.getState().cmdkOpen).toBe(false);
  });

  it('esc closes only cmdk when onboardingLocked', () => {
    useShell.setState({
      onboardingLocked: true,
      drawer: { open: true, kind: 'onboarding' },
      cmdkOpen: true,
    });
    useShell.getState().esc();
    expect(useShell.getState().drawer.open).toBe(true);
    expect(useShell.getState().cmdkOpen).toBe(false);
  });

  it('byokSetupComplete unlocks and closes the drawer', () => {
    useShell.setState({
      onboardingLocked: true,
      drawer: { open: true, kind: 'onboarding' },
    });
    useShell.getState().byokSetupComplete();
    expect(useShell.getState().onboardingLocked).toBe(false);
    expect(useShell.getState().drawer.open).toBe(false);
  });

  it('cmdkHotkey toggles cmdkOpen', () => {
    expect(useShell.getState().cmdkOpen).toBe(false);
    useShell.getState().cmdkHotkey();
    expect(useShell.getState().cmdkOpen).toBe(true);
    useShell.getState().cmdkHotkey();
    expect(useShell.getState().cmdkOpen).toBe(false);
  });
});
