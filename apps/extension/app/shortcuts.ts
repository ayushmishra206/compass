import { useShortcuts, type Shortcut } from '@compass/ui';
import { useShell } from '@app/state/shell.js';

/**
 * Global shortcut bindings for the Phase 1.6 shell.
 * - ⌘+K / Ctrl+K → toggle command palette
 * - ?+b / ?+t / ?+g / ?+n / ?+i / ?+f → open the matching drawer
 * - Esc closes drawer + cmdk
 */
export function useGlobalShortcuts() {
  const shell = useShell();
  const shortcuts: Shortcut[] = [
    { keys: ['⌘', 'k'], handler: () => shell.cmdkHotkey() },
    { keys: ['escape'], handler: () => shell.esc() },
    { keys: ['?', 'b'], handler: () => shell.navClick('brief') },
    { keys: ['?', 't'], handler: () => shell.navClick('today') },
    { keys: ['?', 'g'], handler: () => shell.navClick('goals') },
    { keys: ['?', 'n'], handler: () => shell.navClick('notes') },
    { keys: ['?', 'i'], handler: () => shell.navClick('inbox') },
    { keys: ['?', 'f'], handler: () => shell.navClick('focus') },
  ];
  useShortcuts(shortcuts);
}
