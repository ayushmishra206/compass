import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/** Serif long-form wrapper used for note bodies and brief tldr text. */
export function Prose({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'font-serif text-[17px] leading-[1.65] text-[var(--ink-2)]',
        '[&_p]:mt-0 [&_p]:mb-2.5 [&_strong]:text-[var(--ink)] [&_strong]:font-semibold',
        className,
      )}
      {...rest}
    />
  );
}
