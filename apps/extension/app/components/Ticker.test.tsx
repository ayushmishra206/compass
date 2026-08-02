import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Ticker } from './Ticker';
import { useBriefStore } from '../state/briefStore';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));
import { rpc } from '@compass/runtime';

vi.mock('../scene/useScene', () => ({
  useScene: () => ({ imageUrl: 'data:image/png;base64,', mood: 'dawn' }),
}));

const NO_SIGNALS: {
  peakFocusHour: number | null;
  streakDays: number;
  streakLastDate: string | null;
  totalFocusMin: number;
  completedSessions: number;
  burnoutEwma: number;
} = {
  peakFocusHour: null,
  streakDays: 0,
  streakLastDate: null,
  totalFocusMin: 0,
  completedSessions: 0,
  burnoutEwma: 0,
};

describe('Ticker — brief + focus signals', () => {
  function withSignals(signals: Partial<typeof NO_SIGNALS>) {
    vi.mocked(rpc).mockImplementation(async (route) => {
      if (route === 'personalization.signals') return { ...NO_SIGNALS, ...signals } as never;
      return { kind: 'loading' } as never;
    });
  }

  beforeEach(() => {
    useBriefStore.setState({ morning: { kind: 'loading' }, eod: { kind: 'loading' } });
    vi.mocked(rpc).mockReset();
    withSignals({});
  });

  it('shows nothing rather than zeroes for a user with no history', async () => {
    render(<Ticker />);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('personalization.signals', {}));
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/focus/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/peak/i)).not.toBeInTheDocument();
  });

  it('renders the streak once there is one', async () => {
    withSignals({ streakDays: 7 });
    render(<Ticker />);
    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());
    expect(screen.getByText(/days/i)).toBeInTheDocument();
  });

  it('singularises a one-day streak', async () => {
    withSignals({ streakDays: 1 });
    render(<Ticker />);
    await waitFor(() => expect(screen.getByText('day')).toBeInTheDocument());
  });

  it('formats focus time in hours and minutes', async () => {
    withSignals({ totalFocusMin: 185 });
    render(<Ticker />);
    await waitFor(() => expect(screen.getByText('3h 5m')).toBeInTheDocument());
  });

  it('renders the peak hour in 12-hour form', async () => {
    withSignals({ peakFocusHour: 14 });
    render(<Ticker />);
    await waitFor(() => expect(screen.getByText('2 pm')).toBeInTheDocument());
  });

  it('never invents biometrics', async () => {
    withSignals({ streakDays: 3 });
    render(<Ticker />);
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.queryByText(/sleep/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recovery/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rhr/i)).not.toBeInTheDocument();
  });

  it('renders watchout pills when state is have-brief', () => {
    const fakeBrief = {
      dateLocal: '2026-05-10',
      kind: 'morning' as const,
      generatedAt: '2026-05-10T08:00:00Z',
      output: { watchouts: ['Recovery is mid', 'Three back-to-backs'] },
      openedAt: null,
      userRating: null,
      providerUsed: 'openrouter',
      costUsd: 0.0003,
    };
    useBriefStore.setState({
      morning: { kind: 'have-brief', brief: fakeBrief as never },
      eod: { kind: 'loading' },
    });
    render(<Ticker />);
    expect(screen.getByText('Recovery is mid')).toBeInTheDocument();
    expect(screen.getByText('Three back-to-backs')).toBeInTheDocument();
  });

  it('renders no watchout pills when state is loading', () => {
    render(<Ticker />);
    // With loading state, no watchout pills should be rendered
    expect(screen.queryByText('Recovery is mid')).not.toBeInTheDocument();
  });
});
