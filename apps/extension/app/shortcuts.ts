import { useShortcuts, type Shortcut } from '@compass/ui';
import { useShell } from '@app/state/shell.js';

/**
 * Register the global keyboard shortcuts:
 * - `⌘ + K` — toggle CmdK semantic search
 * - `Esc`   — close drawers and cmd palette
 */
export function useGlobalShortcuts() {
  const shell = useShell();
  const shortcuts: Shortcut[] = [
    {
      keys: ['⌘', 'k'],
      handler: () => shell.cmdkHotkey(),
    },
    {
      keys: ['escape'],
      handler: () => {
        shell.esc();
      },
    },
  ];
  useShortcuts(shortcuts);
}
