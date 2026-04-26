import { useEffect, useState } from 'react';

/**
 * useState backed by `localStorage` (persistent) or `sessionStorage`
 * (per-session). In an extension context, also mirrors writes to
 * `chrome.storage.sync` / `chrome.storage.session` so values survive service
 * worker restarts. Reads are local-only (instant).
 */
export function usePersistentState<T>(key: string, initial: T, sessionOnly = false) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = (sessionOnly ? sessionStorage : localStorage).getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      (sessionOnly ? sessionStorage : localStorage).setItem(key, JSON.stringify(v));
    } catch {
      /* quota or serialisation — silently ignore */
    }
    // Mirror to chrome.storage when available (extension runtime).
    const maybeChrome = (globalThis as { chrome?: unknown }).chrome as
      | {
          storage?: {
            sync?: { set: (kv: Record<string, unknown>) => void };
            session?: { set: (kv: Record<string, unknown>) => void };
          };
        }
      | undefined;
    const area = sessionOnly ? maybeChrome?.storage?.session : maybeChrome?.storage?.sync;
    area?.set({ [key]: v });
  }, [key, v, sessionOnly]);

  return [v, setV] as const;
}
