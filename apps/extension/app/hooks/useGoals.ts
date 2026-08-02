import { useCallback, useEffect, useState } from 'react';
import { rpc } from '@compass/runtime';
import type { StoredGoal } from '@compass/db';

export type GoalsState =
  | { kind: 'loading' }
  | { kind: 'ready'; goals: StoredGoal[] }
  | { kind: 'error'; message: string };

export interface NewGoal {
  title: string;
  why?: string;
  horizon: 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
}

/** Fraction of milestones completed. Undecomposed goals have no progress yet. */
export function goalProgress(goal: StoredGoal): number {
  if (goal.milestones.length === 0) return 0;
  return goal.milestones.filter((m) => m.done).length / goal.milestones.length;
}

export function weeksRemaining(goal: StoredGoal, now: Date = new Date()): number {
  const ms = Date.parse(goal.endDate) - now.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / (7 * 86_400_000)));
}

export function useGoals(): {
  state: GoalsState;
  decomposing: string | null;
  create: (input: NewGoal) => Promise<void>;
  remove: (id: string) => Promise<void>;
  decompose: (id: string) => Promise<string | null>;
  toggleMilestone: (milestoneId: string, done: boolean) => Promise<void>;
} {
  const [state, setState] = useState<GoalsState>({ kind: 'loading' });
  const [decomposing, setDecomposing] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await rpc('goals.list', {});
      setState({ kind: 'ready', goals: res.goals });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (input: NewGoal) => {
      await rpc('goals.create', input);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await rpc('goals.delete', { id });
      await reload();
    },
    [reload],
  );

  /** Returns an error message, or null on success. */
  const decompose = useCallback(
    async (id: string): Promise<string | null> => {
      setDecomposing(id);
      try {
        const res = await rpc('goals.decompose', { id });
        if (!res.ok) {
          return res.reason === 'locked'
            ? 'Unlock your API key to generate a plan.'
            : (res.error ?? 'Could not generate a plan.');
        }
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      } finally {
        setDecomposing(null);
      }
    },
    [reload],
  );

  const toggleMilestone = useCallback(
    async (milestoneId: string, done: boolean) => {
      await rpc('goals.setMilestoneDone', { milestoneId, done });
      await reload();
    },
    [reload],
  );

  return { state, decomposing, create, remove, decompose, toggleMilestone };
}
