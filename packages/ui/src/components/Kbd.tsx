import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/** Keyboard key pill (e.g., ⌘ K). */
export function Kbd({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-[18px] px-[5px] font-mono text-[10px]',
        'text-[var(--color-ink-3)] bg-[var(--color-panel-2)] border border-[var(--color-hair)] rounded',
        className,
      )}
      {...rest}
    />
  );
}
