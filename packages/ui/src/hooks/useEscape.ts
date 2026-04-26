import { useEffect } from 'react';

/**
 * Fire `onEscape` when the Escape key is pressed. Listener is only attached
 * while `active` is true, so multiple modals can stack without fighting each
 * other (only the topmost sets `active`).
 */
export function useEscape(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onEscape, active]);
}
