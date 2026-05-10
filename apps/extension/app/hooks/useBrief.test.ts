import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBrief } from './useBrief';
import { useBriefStore } from '../state/briefStore';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));
import { rpc } from '@compass/runtime';

describe('useBrief', () => {
  beforeEach(() => {
    vi.mocked(rpc).mockReset();
    useBriefStore.setState({ morning: { kind: 'loading' }, eod: { kind: 'loading' } });
  });

  it('calls rpc(brief.getOrGenerate) on mount and updates store with have-brief', async () => {
    const fakeBrief = {
      dateLocal: '2026-05-10',
      kind: 'morning',
      generatedAt: '2026-05-10T08:00:00Z',
      output: { tldr: 'test' },
      openedAt: null,
      userRating: null,
      providerUsed: 'openrouter',
      costUsd: 0.0003,
    };
    vi.mocked(rpc).mockResolvedValueOnce({ kind: 'have-brief', brief: fakeBrief } as never);

    renderHook(() => useBrief('morning'));

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('brief.getOrGenerate', { kind: 'morning' });
    });
    await waitFor(() => {
      expect(useBriefStore.getState().morning).toEqual({ kind: 'have-brief', brief: fakeBrief });
    });
  });

  it('updates store with too-early when rpc returns that', async () => {
    vi.mocked(rpc).mockResolvedValueOnce({
      kind: 'too-early',
      readyAt: '2026-05-10T08:00:00Z',
    } as never);
    renderHook(() => useBrief('morning'));
    await waitFor(() =>
      expect(useBriefStore.getState().morning).toEqual({
        kind: 'too-early',
        readyAt: '2026-05-10T08:00:00Z',
      }),
    );
  });

  it('updates store with locked-no-brief when rpc returns that', async () => {
    vi.mocked(rpc).mockResolvedValueOnce({ kind: 'locked-no-brief' } as never);
    renderHook(() => useBrief('morning'));
    await waitFor(() => expect(useBriefStore.getState().morning.kind).toBe('locked-no-brief'));
  });

  it('regenerate calls rpc(brief.morning, force=true)', async () => {
    vi.mocked(rpc).mockResolvedValue({
      kind: 'have-brief',
      brief: { dateLocal: '2026-05-10', kind: 'morning' },
    } as never);
    const { result } = renderHook(() => useBrief('morning'));
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    vi.mocked(rpc).mockClear();
    vi.mocked(rpc).mockResolvedValueOnce({
      stored: { dateLocal: '2026-05-10', kind: 'morning', output: { tldr: 'fresh' } },
    } as never);

    await act(async () => {
      await result.current.regenerate();
    });

    expect(rpc).toHaveBeenCalledWith('brief.morning', { trigger: 'manual', force: true });
  });

  it('recordOpen calls rpc(brief.recordOpen, ...) when state is have-brief', async () => {
    const fakeBrief = {
      dateLocal: '2026-05-10',
      kind: 'morning',
      output: {},
      openedAt: null,
    };
    useBriefStore.setState({ morning: { kind: 'have-brief', brief: fakeBrief as never } });
    vi.mocked(rpc).mockResolvedValueOnce({ kind: 'have-brief', brief: fakeBrief } as never);
    vi.mocked(rpc).mockResolvedValueOnce({ ok: true } as never);
    const { result } = renderHook(() => useBrief('morning'));

    await act(async () => {
      await result.current.recordOpen();
    });

    const calls = vi.mocked(rpc).mock.calls;
    const recordOpenCall = calls.find((c) => c[0] === 'brief.recordOpen');
    expect(recordOpenCall).toBeDefined();
    expect(recordOpenCall![1]).toEqual({ dateLocal: '2026-05-10', kind: 'morning' });
  });

  it('recordRating calls rpc(brief.recordRating) with rating', async () => {
    const fakeBrief = {
      dateLocal: '2026-05-10',
      kind: 'morning',
      output: {},
    };
    useBriefStore.setState({ morning: { kind: 'have-brief', brief: fakeBrief as never } });
    vi.mocked(rpc).mockResolvedValueOnce({ kind: 'have-brief', brief: fakeBrief } as never);
    vi.mocked(rpc).mockResolvedValueOnce({ ok: true } as never);
    const { result } = renderHook(() => useBrief('morning'));

    await act(async () => {
      await result.current.recordRating(1);
    });

    const calls = vi.mocked(rpc).mock.calls;
    const ratingCall = calls.find((c) => c[0] === 'brief.recordRating');
    expect(ratingCall).toBeDefined();
    expect(ratingCall![1]).toEqual({ dateLocal: '2026-05-10', kind: 'morning', rating: 1 });
  });
});
