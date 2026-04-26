import { useEffect, useRef } from 'react';

export interface Shortcut {
  /**
   * Key sequence:
   * - `['⌘', 'k']` → Cmd/Ctrl+K
   * - `['?', 'b']` → two-key chord: `?` followed by `b` within 1.5s
   * - `['escape']` → single key
   */
  keys: readonly string[];
  handler: (e: KeyboardEvent) => void;
}

/**
 * Register global keyboard shortcuts. Listener is attached while `active` is
 * true. Chord buffer resets after 1.5 s of inactivity.
 */
export function useShortcuts(shortcuts: readonly Shortcut[], active = true): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!active) return;
    let chord: string | null = null;
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    const clearChord = () => {
      chord = null;
      if (chordTimer) {
        clearTimeout(chordTimer);
        chordTimer = null;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;

      for (const s of shortcutsRef.current) {
        const [first, second] = s.keys;

        // ⌘+key
        if (first === '⌘' && second && mod && k === second) {
          e.preventDefault();
          s.handler(e);
          return;
        }

        // single key without modifier
        if (s.keys.length === 1 && first === k && !mod) {
          e.preventDefault();
          s.handler(e);
          return;
        }

        // chord: first key started, second now pressed
        if (s.keys.length === 2 && first !== '⌘' && chord === first && k === second && !mod) {
          e.preventDefault();
          s.handler(e);
          clearChord();
          return;
        }
      }

      // Set up chord buffer for any chord-starting keys
      const isChordStart = shortcutsRef.current.some(
        (s) => s.keys.length === 2 && s.keys[0] !== '⌘' && s.keys[0] === k,
      );
      if (isChordStart && !mod) {
        chord = k;
        if (chordTimer) clearTimeout(chordTimer);
        chordTimer = setTimeout(clearChord, 1500);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (chordTimer) clearTimeout(chordTimer);
    };
  }, [active]);
}
