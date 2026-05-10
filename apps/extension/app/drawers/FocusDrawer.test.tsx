import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FocusDrawer } from './FocusDrawer';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn(async () => ({ ok: true })) }));
import { rpc } from '@compass/runtime';

vi.mock('../mocks/index.js', () => ({
  MOCK: {
    brief: { quotedGoal: 'Ship it.' },
    soundscapes: [],
    blockRules: [],
  },
}));

describe('FocusDrawer — Pomodoro lifecycle RPC', () => {
  beforeEach(() => {
    vi.mocked(rpc)
      .mockClear()
      .mockResolvedValue({ ok: true } as never);
  });

  it('renders theme input and Start button initially', () => {
    render(<FocusDrawer />);
    expect(screen.getByLabelText(/pomodoro theme/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('clicking Start fires pomodoro.start with a UUID + duration + optional theme', async () => {
    render(<FocusDrawer />);
    const themeInput = screen.getByLabelText(/pomodoro theme/i) as HTMLInputElement;
    fireEvent.change(themeInput, { target: { value: 'PRD final pass' } });
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => {
      const call = vi.mocked(rpc).mock.calls.find((c) => c[0] === 'pomodoro.start');
      expect(call).toBeDefined();
      const args = call![1] as { id: string; durationMin: number; theme?: string };
      expect(args.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(args.durationMin).toBe(25);
      expect(args.theme).toBe('PRD final pass');
    });
  });

  it('clicking Start without theme omits theme field from RPC payload', async () => {
    render(<FocusDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => {
      const call = vi.mocked(rpc).mock.calls.find((c) => c[0] === 'pomodoro.start');
      expect(call).toBeDefined();
      const args = call![1] as { id: string; durationMin: number; theme?: string };
      expect(args.theme).toBeUndefined();
    });
  });

  it('after Start, shows Pause and Stop buttons; theme input hidden', async () => {
    render(<FocusDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText(/pomodoro theme/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  it('clicking Stop fires pomodoro.abandon with the active ID', async () => {
    render(<FocusDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // Wait for start to complete and buttons to appear
    await waitFor(() => {
      expect(vi.mocked(rpc).mock.calls.some((c) => c[0] === 'pomodoro.start')).toBe(true);
    });
    const startCall = vi.mocked(rpc).mock.calls.find((c) => c[0] === 'pomodoro.start')!;
    const startedId = (startCall[1] as { id: string }).id;

    await waitFor(() => screen.getByRole('button', { name: /stop/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    await waitFor(() => {
      const abandonCall = vi.mocked(rpc).mock.calls.find((c) => c[0] === 'pomodoro.abandon');
      expect(abandonCall).toBeDefined();
      expect((abandonCall![1] as { id: string }).id).toBe(startedId);
    });
  });

  it('after Stop, resets to Start state with theme input visible', async () => {
    render(<FocusDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => screen.getByRole('button', { name: /stop/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/pomodoro theme/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });
  });

  it('Pause/Resume toggles running without firing additional RPC', async () => {
    render(<FocusDrawer />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => screen.getByRole('button', { name: /pause/i }));

    const callCountBefore = vi.mocked(rpc).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    await waitFor(() => screen.getByRole('button', { name: /resume/i }));
    // No new RPC calls on pause
    expect(vi.mocked(rpc).mock.calls.length).toBe(callCountBefore);
  });

  describe('countdown auto-complete', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('countdown reaching 0 fires pomodoro.complete with the active ID', async () => {
      // Use fake timers but we need the rpc promise to resolve.
      // Restore real timers briefly so waitFor can work, or use act.
      render(<FocusDrawer />);

      // Click start — rpc is synchronously mocked, but it's async so we need to flush.
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start/i }));
        // Flush the async rpc('pomodoro.start') promise
        await Promise.resolve();
        await Promise.resolve();
      });

      const startCall = vi.mocked(rpc).mock.calls.find((c) => c[0] === 'pomodoro.start')!;
      expect(startCall).toBeDefined();
      const startedId = (startCall[1] as { id: string }).id;

      // Advance fake timers by full 25-min duration + extra tick
      await act(async () => {
        vi.advanceTimersByTime(25 * 60 * 1000 + 1000);
        await Promise.resolve();
        await Promise.resolve();
      });

      const completeCall = vi.mocked(rpc).mock.calls.find((c) => c[0] === 'pomodoro.complete');
      expect(completeCall).toBeDefined();
      expect((completeCall![1] as { id: string }).id).toBe(startedId);
    });
  });
});
