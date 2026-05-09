import { useEffect } from 'react';
import { ThemeProvider, Stage, Drawer } from '@compass/ui';
import { useShell } from '@app/state/shell.js';
import { useScene } from '@app/scene/useScene.js';
import { useGlobalShortcuts } from '@app/shortcuts.js';
import { Topbar } from '@app/components/Topbar.js';
import { Hero } from '@app/components/Hero.js';
import { Ticker } from '@app/components/Ticker.js';
import { CmdK } from '@app/components/CmdK.js';
import { BriefDrawer } from '@app/drawers/BriefDrawer.js';
import { TodayDrawer } from '@app/drawers/TodayDrawer.js';
import { GoalsDrawer } from '@app/drawers/GoalsDrawer.js';
import { NotesDrawer } from '@app/drawers/NotesDrawer.js';
import { InboxDrawer } from '@app/drawers/InboxDrawer.js';
import { FocusDrawer } from '@app/drawers/FocusDrawer.js';
import { ProfileDrawer } from '@app/drawers/ProfileDrawer.js';
import { OnboardingDrawer } from '@app/drawers/OnboardingDrawer.js';

const TITLES = {
  brief: 'Morning brief',
  today: 'Today',
  goals: 'Goals',
  notes: 'Notes',
  inbox: 'Inbox',
  focus: 'Focus',
  profile: 'Profile',
  onboarding: 'Welcome to Compass',
} as const;

export function App() {
  const accent = useShell((s) => s.accent);
  const drawer = useShell((s) => s.drawer);
  const closeDrawer = useShell((s) => s.closeDrawer);
  const onboardingLocked = useShell((s) => s.onboardingLocked);
  const cmdkHotkey = useShell((s) => s.cmdkHotkey);
  const esc = useShell((s) => s.esc);
  const scene = useScene();

  useGlobalShortcuts();

  // Hydrate onboardingLocked from chrome.storage.local on mount.
  useEffect(() => {
    chrome.storage.local
      .get('profile.byokConfigured')
      .then((res) => {
        const configured = res['profile.byokConfigured'] === true;
        useShell.setState({
          onboardingLocked: !configured,
          drawer: !configured ? { open: true, kind: 'onboarding' } : useShell.getState().drawer,
        });
      })
      .catch(() => {
        // permission or runtime error — leave default unlocked state
      });
  }, []);

  // Global hotkeys (⌘K / Esc) registered redundantly here so they work even
  // before useGlobalShortcuts mounts; chord-style drawer shortcuts live
  // entirely in useGlobalShortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        cmdkHotkey();
      }
      if (e.key === 'Escape') esc();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdkHotkey, esc]);

  useEffect(() => {
    void useShell.getState().refreshLockState();
  }, []);

  return (
    <ThemeProvider accent={accent}>
      <Stage imageUrl={scene.imageUrl} />
      <div
        style={{
          position: 'relative',
          height: '100vh',
          display: 'grid',
          gridTemplateRows: '56px 1fr 80px',
          zIndex: 1,
        }}
      >
        <Topbar />
        <Hero />
        <Ticker />
      </div>
      <Drawer
        open={drawer.open}
        kind={drawer.kind}
        title={drawer.kind ? TITLES[drawer.kind] : ''}
        meta={drawer.kind === 'brief' ? 'claude · 4.2s' : undefined}
        onClose={closeDrawer}
        dismissLocked={onboardingLocked && drawer.kind === 'onboarding'}
      >
        {drawer.kind === 'brief' && <BriefDrawer />}
        {drawer.kind === 'today' && <TodayDrawer />}
        {drawer.kind === 'goals' && <GoalsDrawer />}
        {drawer.kind === 'notes' && <NotesDrawer />}
        {drawer.kind === 'inbox' && <InboxDrawer />}
        {drawer.kind === 'focus' && <FocusDrawer />}
        {drawer.kind === 'profile' && <ProfileDrawer />}
        {drawer.kind === 'onboarding' && <OnboardingDrawer />}
      </Drawer>
      <CmdK />
    </ThemeProvider>
  );
}
