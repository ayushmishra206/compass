import { cn } from '../utils/cn.js';

export interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
}

/** Animated pill switch; `role="switch"` + `aria-checked`. */
export function Toggle({ on, onChange, disabled, ...aria }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      {...aria}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors',
        on ? 'bg-[var(--accent)]' : 'bg-[var(--hair-2)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_oklch(0_0_0_/_0.2)] transition-[left]',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}
