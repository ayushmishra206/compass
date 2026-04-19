import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/** Mono-cased tag used for note tags and similar labels. */
export function Tag({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel-2)]',
        'text-[var(--ink-3)] border border-[var(--hair)]',
        className,
      )}
      {...rest}
    />
  );
}
