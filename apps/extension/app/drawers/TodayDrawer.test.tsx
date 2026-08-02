import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TodayDrawer } from './TodayDrawer';
import type { CalendarState } from '../hooks/useCalendar';

let state: CalendarState = { kind: 'loading' };

vi.mock('../hooks/useCalendar.js', () => ({
  useCalendar: () => ({ state, refresh: vi.fn() }),
}));

const ev = (over: Partial<{ id: string; start: string; end: string; summary: string }> = {}) => ({
  id: 'e1',
  start: '09:00',
  end: '10:00',
  summary: 'Design review',
  isFocusBlock: false,
  hasConference: false,
  allDay: false,
  ...over,
});

beforeEach(() => {
  state = { kind: 'loading' };
});

describe('TodayDrawer', () => {
  it('shows a loading state', () => {
    render(<TodayDrawer />);
    expect(screen.getByText(/loading your day/i)).toBeInTheDocument();
  });

  it('invites the user to connect when no calendar is linked', () => {
    state = { kind: 'not-connected' };
    render(<TodayDrawer />);
    expect(screen.getByText(/no calendar connected/i)).toBeInTheDocument();
  });

  it('says the day is clear rather than showing an empty grid', () => {
    state = { kind: 'ready', events: [], syncedAt: null };
    render(<TodayDrawer />);
    expect(screen.getByText(/nothing scheduled/i)).toBeInTheDocument();
  });

  it('renders real events', () => {
    state = { kind: 'ready', events: [ev(), ev({ id: 'e2', summary: 'Standup' })], syncedAt: null };
    render(<TodayDrawer />);
    expect(screen.getByText('Design review')).toBeInTheDocument();
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  it('marks events that have a conference link', () => {
    state = { kind: 'ready', events: [ev({ id: 'e3' })], syncedAt: null };
    state.events[0]!.hasConference = true;
    render(<TodayDrawer />);
    expect(screen.getByText('meet')).toBeInTheDocument();
  });

  it('lists all-day events outside the hour grid', () => {
    const allDay = ev({ id: 'ad', summary: 'Conference' });
    allDay.allDay = true;
    state = { kind: 'ready', events: [allDay], syncedAt: null };
    render(<TodayDrawer />);
    expect(screen.getByText(/all day · Conference/)).toBeInTheDocument();
  });

  it('surfaces an error message instead of failing silently', () => {
    state = { kind: 'error', message: 'network down' };
    render(<TodayDrawer />);
    expect(screen.getByText('network down')).toBeInTheDocument();
  });

  it('has no axe violations with events on screen', async () => {
    state = { kind: 'ready', events: [ev()], syncedAt: null };
    const { container } = render(<TodayDrawer />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
