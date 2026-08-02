import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';

/**
 * PRD §19.5 / §16.6 — every AI surface meets WCAG 2.2 AA, axe-core in CI.
 *
 * Each drawer is rendered in its default (unconnected / empty) state, which is
 * what a first-run user actually sees and the state most likely to be built
 * without a11y attention.
 */

vi.mock('@compass/runtime', () => ({ rpc: vi.fn(async () => ({})) }));
vi.mock('../scene/useScene.js', () => ({
  useScene: () => ({ imageUrl: '', mood: 'dawn' }),
}));
vi.mock('../scene/useScene', () => ({
  useScene: () => ({ imageUrl: '', mood: 'dawn' }),
}));

import { rpc } from '@compass/runtime';
import { BriefDrawer } from './BriefDrawer';
import { TodayDrawer } from './TodayDrawer';
import { GoalsDrawer } from './GoalsDrawer';
import { NotesDrawer } from './NotesDrawer';
import { InboxDrawer } from './InboxDrawer';
import { FocusDrawer } from './FocusDrawer';
import { ProfileDrawer } from './ProfileDrawer';

beforeEach(() => {
  vi.mocked(rpc).mockImplementation(async (route: string) => {
    if (route === 'blocker.list') return { rules: [] } as never;
    if (route === 'goals.list') return { goals: [] } as never;
    if (route === 'inbox.list') return { messages: [] } as never;
    if (route === 'inbox.status') return { connected: false, count: 0 } as never;
    if (route === 'calendar.status') return { connected: false } as never;
    if (route === 'calendar.listRange') return { events: [] } as never;
    if (route === 'notes.list') return { notes: [] } as never;
    if (route === 'personalization.signals') {
      return {
        peakFocusHour: null,
        streakDays: 0,
        streakLastDate: null,
        totalFocusMin: 0,
        completedSessions: 0,
        burnoutEwma: 0,
      } as never;
    }
    return { ok: true } as never;
  });
});

const DRAWERS: Array<[string, () => ReactElement]> = [
  ['Brief', BriefDrawer],
  ['Today', TodayDrawer],
  ['Goals', GoalsDrawer],
  ['Notes', NotesDrawer],
  ['Inbox', InboxDrawer],
  ['Focus', FocusDrawer],
  ['Profile', ProfileDrawer],
];

describe('drawer accessibility', () => {
  it.each(DRAWERS)('%s drawer has no axe violations', async (_name, Drawer) => {
    const { container } = render(<Drawer />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
