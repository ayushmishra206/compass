import { useEffect, useCallback } from 'react';
import { rpc } from '@compass/runtime';
import { useBriefStore, type BriefState } from '../state/briefStore';

export function useBrief(kind: 'morning' | 'eod' = 'morning'): {
  state: BriefState;
  regenerate: () => Promise<void>;
  recordOpen: () => Promise<void>;
  recordRating: (r: -1 | 1) => Promise<void>;
} {
  const state = useBriefStore((s) => (kind === 'morning' ? s.morning : s.eod));
  const set = useBriefStore((s) => (kind === 'morning' ? s.setMorning : s.setEod));

  useEffect(() => {
    let cancelled = false;
    void rpc('brief.getOrGenerate', { kind })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === 'have-brief') set({ kind: 'have-brief', brief: res.brief });
        else if (res.kind === 'too-early') set({ kind: 'too-early', readyAt: res.readyAt });
        else if (res.kind === 'locked-no-brief') set({ kind: 'locked-no-brief' });
        else set({ kind: 'loading' });
      })
      .catch((e) => {
        if (cancelled) return;
        set({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [kind, set]);

  const regenerate = useCallback(async () => {
    set({ kind: 'loading' });
    const route = kind === 'morning' ? 'brief.morning' : 'brief.eod';
    const res = await rpc(route, { trigger: 'manual', force: true });
    if ('stored' in res) set({ kind: 'have-brief', brief: res.stored });
    else if ('skipped' in res) set({ kind: 'locked-no-brief' });
  }, [kind, set]);

  const recordOpen = useCallback(async () => {
    if (state.kind !== 'have-brief') return;
    await rpc('brief.recordOpen', { dateLocal: state.brief.dateLocal, kind });
    set({ kind: 'have-brief', brief: { ...state.brief, openedAt: new Date().toISOString() } });
  }, [kind, state, set]);

  const recordRating = useCallback(
    async (r: -1 | 1) => {
      if (state.kind !== 'have-brief') return;
      await rpc('brief.recordRating', { dateLocal: state.brief.dateLocal, kind, rating: r });
      set({ kind: 'have-brief', brief: { ...state.brief, userRating: r } });
    },
    [kind, state, set],
  );

  return { state, regenerate, recordOpen, recordRating };
}
