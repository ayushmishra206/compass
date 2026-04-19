import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'sage' | 'slate';
}

const variantCls: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[var(--panel-2)] text-[var(--ink-3)] border border-[var(--hair)]',
  accent: 'bg-[var(--accent-wash)] text-[var(--accent-ink)] border border-transparent',
  sage: 'bg-[oklch(0.55_0.05_150_/_0.12)] text-[oklch(0.34_0.05_150)] border border-transparent',
  slate: 'bg-[oklch(0.52_0.03_255_/_0.12)] text-[oklch(0.34_0.04_255)] border border-transparent',
};

/** Small mono-cased label pill. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'default', className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      data-variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded-full',
        variantCls[variant],
        className,
      )}
      {...rest}
    />
  );
});

/** Small filled dot, typically inline inside Badge. */
export function Dot({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('inline-block w-1.5 h-1.5 rounded-full bg-current', className)} {...rest} />
  );
}
