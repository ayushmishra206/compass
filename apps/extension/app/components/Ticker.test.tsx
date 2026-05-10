import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Ticker } from './Ticker';
import { useBriefStore } from '../state/briefStore';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));
import { rpc } from '@compass/runtime';

vi.mock('../scene/useScene', () => ({
  useScene: () => ({ imageUrl: 'data:image/png;base64,', mood: 'dawn' }),
}));

describe('Ticker — useBrief + streak', () => {
  beforeEach(() => {
    useBriefStore.setState({ morning: { kind: 'loading' }, eod: { kind: 'loading' } });
    vi.mocked(rpc).mockReset();
    // Default: brief.streak returns 0, brief.getOrGenerate returns loading
    vi.mocked(rpc).mockImplementation(async (route) => {
      if (route === 'brief.streak') return { days: 0, lastDate: null } as never;
      return { kind: 'loading' } as never;
    });
  });

  it('does not render streak chip when days is 0', async () => {
    render(<Ticker />);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('brief.streak', {}));
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  });

  it('renders streak chip when days > 0', async () => {
    vi.mocked(rpc).mockImplementation(async (route) => {
      if (route === 'brief.streak') return { days: 7, lastDate: '2026-05-09' } as never;
      return { kind: 'loading' } as never;
    });
    render(<Ticker />);
    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());
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
