import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useShell } from './shell.js';
import type * as CompassCore from '@compass/core';

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

vi.mock('@compass/core', async (importOriginal) => {
  const actual = await importOriginal<typeof CompassCore>();
  return {
    ...actual,
    isEncryptionEnabled: vi.fn(async () => false),
    isLocked: vi.fn(async () => false),
    unlockCredentials: vi.fn(async () => undefined),
    lockCredentials: vi.fn(async () => undefined),
  };
});
import { isEncryptionEnabled, isLocked, unlockCredentials, lockCredentials } from '@compass/core';

describe('shell — lock-state slice', () => {
  beforeEach(() => {
    useShell.setState({
      encryptionEnabled: false,
      locked: false,
      unlockHint: false,
      drawer: { open: false, kind: null },
    });
    vi.mocked(isEncryptionEnabled).mockReset().mockResolvedValue(false);
    vi.mocked(isLocked).mockReset().mockResolvedValue(false);
    vi.mocked(unlockCredentials).mockReset().mockResolvedValue(undefined);
    vi.mocked(lockCredentials).mockReset().mockResolvedValue(undefined);
  });

  it('refreshLockState reads from core and updates state', async () => {
    vi.mocked(isEncryptionEnabled).mockResolvedValueOnce(true);
    vi.mocked(isLocked).mockResolvedValueOnce(true);

    await useShell.getState().refreshLockState();

    expect(useShell.getState().encryptionEnabled).toBe(true);
    expect(useShell.getState().locked).toBe(true);
  });

  it('unlock calls unlockCredentials and clears locked + unlockHint', async () => {
    useShell.setState({ locked: true, unlockHint: true });
    await useShell.getState().unlock('a-passphrase');
    expect(unlockCredentials).toHaveBeenCalledWith('a-passphrase');
    expect(useShell.getState().locked).toBe(false);
    expect(useShell.getState().unlockHint).toBe(false);
  });

  it('unlock surfaces error when unlockCredentials rejects', async () => {
    vi.mocked(unlockCredentials).mockRejectedValueOnce(new Error('bad pass'));
    await expect(useShell.getState().unlock('wrong')).rejects.toThrow('bad pass');
    expect(useShell.getState().locked).toBe(false); // unchanged because the action threw before set
  });

  it('lock calls lockCredentials and sets locked=true', async () => {
    await useShell.getState().lock();
    expect(lockCredentials).toHaveBeenCalled();
    expect(useShell.getState().locked).toBe(true);
  });

  it('requestUnlock opens profile drawer and sets unlockHint', () => {
    useShell.getState().requestUnlock();
    expect(useShell.getState().drawer).toEqual({ open: true, kind: 'profile' });
    expect(useShell.getState().unlockHint).toBe(true);
  });

  it('setEncryptionState updates both flags', () => {
    useShell.getState().setEncryptionState(true, false);
    expect(useShell.getState().encryptionEnabled).toBe(true);
    expect(useShell.getState().locked).toBe(false);
  });

  it('clearUnlockHint flips unlockHint to false', () => {
    useShell.setState({ unlockHint: true });
    useShell.getState().clearUnlockHint();
    expect(useShell.getState().unlockHint).toBe(false);
  });
});
