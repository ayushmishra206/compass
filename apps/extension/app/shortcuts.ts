import { useShortcuts, type Shortcut } from '@compass/ui';
import { useShell } from '@app/state/shell.js';

/**
 * Register the global keyboard shortcuts:
 * - `⌘ + K` — toggle CmdK semantic search
 * - `Esc`   — close any open overlay
 * - `? + d` — toggle Tweaks panel
 */
export function useGlobalShortcuts() {
  const shell = useShell();
  const shortcuts: Shortcut[] = [
    {
      keys: ['⌘', 'k'],
      handler: () => (shell.overlay === 'cmdK' ? shell.closeOverlay() : shell.openOverlay('cmdK')),
    },
    {
      keys: ['escape'],
      handler: () => {
        if (shell.overlay) shell.closeOverlay();
      },
    },
    {
      keys: ['?', 'd'],
      handler: () => shell.setTweaksOpen(!shell.tweaksOpen),
    },
  ];
  useShortcuts(shortcuts);
}
