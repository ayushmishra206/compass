import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GoalsDrawer } from './GoalsDrawer';
import type { GoalsState } from '../hooks/useGoals';
import type { StoredGoal } from '@compass/db';

const create = vi.fn(async () => {});
const remove = vi.fn(async () => {});
const decompose = vi.fn(async () => null as string | null);
const toggleMilestone = vi.fn(async () => {});

let state: GoalsState = { kind: 'loading' };
let decomposing: string | null = null;

vi.mock('../hooks/useGoals.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useGoals: () => ({ state, decomposing, create, remove, decompose, toggleMilestone }),
  };
});

const goal = (over: Partial<StoredGoal> = {}): StoredGoal => ({
  id: 'g1',
  createdAt: '2026-07-01T00:00:00.000Z',
  horizon: 'quarter',
  startDate: '2026-07-01',
  endDate: '2026-09-30',
  title: 'Ship the alpha',
  why: 'It has been half-built for months.',
  status: 'active',
  decomposedAt: null,
  modelId: null,
  dailyTemplates: [],
  risks: [],
  firstWeekFocus: null,
  milestones: [],
  ...over,
});

beforeEach(() => {
  state = { kind: 'loading' };
  decomposing = null;
  vi.clearAllMocks();
});

describe('GoalsDrawer', () => {
  it('shows a loading state', () => {
    render(<GoalsDrawer />);
    expect(screen.getByText(/loading goals/i)).toBeInTheDocument();
  });

  it('invites a first goal when there are none', () => {
    state = { kind: 'ready', goals: [] };
    render(<GoalsDrawer />);
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
  });

  it('renders a goal with its why', () => {
    state = { kind: 'ready', goals: [goal()] };
    render(<GoalsDrawer />);
    expect(screen.getByText('Ship the alpha')).toBeInTheDocument();
    expect(screen.getByText(/half-built for months/)).toBeInTheDocument();
  });

  it('offers to build a plan when the goal has no milestones', () => {
    state = { kind: 'ready', goals: [goal()] };
    render(<GoalsDrawer />);
    expect(screen.getByRole('button', { name: /break into milestones/i })).toBeInTheDocument();
  });

  it('offers a re-plan once milestones exist', () => {
    state = {
      kind: 'ready',
      goals: [
        goal({
          milestones: [
            {
              id: 'm1',
              goalId: 'g1',
              weekIndex: 1,
              title: 'Calendar lands',
              targetDate: null,
              definitionOfDone: '',
              done: false,
              completedAt: null,
            },
          ],
        }),
      ],
    };
    render(<GoalsDrawer />);
    expect(screen.getByRole('button', { name: /re-plan/i })).toBeInTheDocument();
    expect(screen.getByText('Calendar lands')).toBeInTheDocument();
  });

  it('shows progress from completed milestones', () => {
    const ms = (id: string, done: boolean) => ({
      id,
      goalId: 'g1',
      weekIndex: 1,
      title: id,
      targetDate: null,
      definitionOfDone: '',
      done,
      completedAt: null,
    });
    state = { kind: 'ready', goals: [goal({ milestones: [ms('a', true), ms('b', false)] })] };
    render(<GoalsDrawer />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('ticks a milestone through the hook', async () => {
    state = {
      kind: 'ready',
      goals: [
        goal({
          milestones: [
            {
              id: 'm1',
              goalId: 'g1',
              weekIndex: 1,
              title: 'Calendar lands',
              targetDate: null,
              definitionOfDone: '',
              done: false,
              completedAt: null,
            },
          ],
        }),
      ],
    };
    render(<GoalsDrawer />);
    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(toggleMilestone).toHaveBeenCalledWith('m1', true));
  });

  it('surfaces a decomposition failure instead of failing silently', async () => {
    decompose.mockResolvedValueOnce('Unlock your API key to generate a plan.');
    state = { kind: 'ready', goals: [goal()] };
    render(<GoalsDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /break into milestones/i }));
    expect(await screen.findByText(/unlock your api key/i)).toBeInTheDocument();
  });

  it('shows a thinking state while decomposing', () => {
    decomposing = 'g1';
    state = { kind: 'ready', goals: [goal()] };
    render(<GoalsDrawer />);
    expect(screen.getByRole('button', { name: /thinking/i })).toBeDisabled();
  });

  it('creates a goal from the form', async () => {
    state = { kind: 'ready', goals: [] };
    render(<GoalsDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /new goal/i }));
    await userEvent.type(screen.getByLabelText(/goal title/i), 'Learn to sail');
    await userEvent.click(screen.getByRole('button', { name: /add goal/i }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Learn to sail' })),
    );
  });

  it('will not create a goal with an empty title', async () => {
    state = { kind: 'ready', goals: [] };
    render(<GoalsDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /new goal/i }));
    expect(screen.getByRole('button', { name: /add goal/i })).toBeDisabled();
  });

  it('surfaces a load error', () => {
    state = { kind: 'error', message: 'db unavailable' };
    render(<GoalsDrawer />);
    expect(screen.getByText('db unavailable')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    state = { kind: 'ready', goals: [goal()] };
    const { container } = render(<GoalsDrawer />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
