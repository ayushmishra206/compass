import { useCallback, useEffect, useState } from 'react';
import { rpc } from '@compass/runtime';
import type { StoredMessage } from '@compass/db';

export type InboxState =
  | { kind: 'loading' }
  | { kind: 'not-connected' }
  | { kind: 'ready'; messages: StoredMessage[] }
  | { kind: 'error'; message: string };

export const PRIORITY_LABEL: Record<string, string> = {
  p1: 'Blocking',
  p2: 'This week',
  p3: 'Read',
  p4: 'FYI',
};

export function useInbox(): {
  state: InboxState;
  syncing: boolean;
  sync: () => Promise<string | null>;
  wipe: () => Promise<void>;
} {
  const [state, setState] = useState<InboxState>({ kind: 'loading' });
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const status = await rpc('inbox.status', {});
      if (!status.connected) {
        setState({ kind: 'not-connected' });
        return;
      }
      const res = await rpc('inbox.list', {});
      setState({ kind: 'ready', messages: res.messages });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Returns an error message, or null on success. */
  const sync = useCallback(async (): Promise<string | null> => {
    setSyncing(true);
    try {
      const res = await rpc('inbox.sync', {});
      if (!res.ok) {
        if (res.reason === 'not-connected') {
          setState({ kind: 'not-connected' });
          return null;
        }
        return res.reason === 'locked'
          ? 'Unlock your API key to scan the inbox.'
          : res.reason === 'auth-expired'
            ? 'Gmail access expired. Reconnect in Profile.'
            : (res.error ?? 'Scan failed.');
      }
      await reload();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  const wipe = useCallback(async () => {
    await rpc('inbox.wipe', {});
    await reload();
  }, [reload]);

  return { state, syncing, sync, wipe };
}
