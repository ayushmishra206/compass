import { useCallback, useEffect, useState } from 'react';
import { rpc } from '@compass/runtime';
import type { StoredBlockRule } from '@compass/db';

/**
 * Block rules live in the offscreen database, but only the service worker can
 * install declarativeNetRequest rules. Rather than have either context reach
 * into the other, this hook reads from one and pushes to the other after every
 * mutation — the UI is the only place that legitimately talks to both.
 */
export function useBlockRules(focusActive: boolean): {
  rules: StoredBlockRule[];
  error: string | null;
  add: (pattern: string, mode: 'hard' | 'soft', focusOnly: boolean) => Promise<string | null>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
} {
  const [rules, setRules] = useState<StoredBlockRule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    async (next: StoredBlockRule[]) => {
      await rpc('blocker.applyRules', { rules: next, focusActive }).catch(() => {});
    },
    [focusActive],
  );

  const reload = useCallback(async () => {
    try {
      const res = await rpc('blocker.list', {});
      setRules(res.rules);
      await apply(res.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [apply]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Returns an error message, or null on success. */
  const add = useCallback(
    async (pattern: string, mode: 'hard' | 'soft', focusOnly: boolean) => {
      const res = await rpc('blocker.add', { pattern, mode, focusOnly });
      if (!res.ok) return res.error;
      await reload();
      return null;
    },
    [reload],
  );

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      await rpc('blocker.setEnabled', { id, enabled });
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await rpc('blocker.remove', { id });
      await reload();
    },
    [reload],
  );

  return { rules, error, add, toggle, remove };
}
