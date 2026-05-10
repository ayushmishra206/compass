import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Hero } from './Hero';
import { useBriefStore } from '../state/briefStore';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn(async () => ({ kind: 'loading' })) }));

vi.mock('../scene/useScene', () => ({
  useScene: () => ({ imageUrl: 'data:image/png;base64,', mood: 'dawn' }),
}));

describe('Hero — useBrief integration', () => {
  beforeEach(() => {
    useBriefStore.setState({
      morning: { kind: 'loading' },
      eod: { kind: 'loading' },
    });
  });

  it('renders empty TLDR when loading', () => {
    const { container } = render(<Hero />);
    expect(container).toBeTruthy();
  });

  it('renders TLDR text when have-brief', async () => {
    const fakeBrief = {
      dateLocal: '2026-05-10',
      kind: 'morning' as const,
      generatedAt: '2026-05-10T08:00:00Z',
      output: { tldr: 'Light schedule today.' },
      openedAt: null,
      userRating: null,
      providerUsed: 'openrouter',
      costUsd: 0.0003,
    };
    useBriefStore.setState({
      morning: { kind: 'have-brief', brief: fakeBrief as never },
      eod: { kind: 'loading' },
    });
    render(<Hero />);
    await waitFor(() => expect(screen.getByText(/Light schedule today\./)).toBeInTheDocument());
  });

  it('renders too-early message when state is too-early', async () => {
    useBriefStore.setState({
      morning: { kind: 'too-early', readyAt: '2026-05-10T08:00:00Z' },
      eod: { kind: 'loading' },
    });
    render(<Hero />);
    await waitFor(() =>
      expect(screen.getByText(/Your morning brief will be ready/)).toBeInTheDocument(),
    );
  });

  it('renders unlock prompt when locked-no-brief', async () => {
    useBriefStore.setState({
      morning: { kind: 'locked-no-brief' },
      eod: { kind: 'loading' },
    });
    render(<Hero />);
    await waitFor(() =>
      expect(screen.getByText(/Your daily brief is waiting/)).toBeInTheDocument(),
    );
  });
});
