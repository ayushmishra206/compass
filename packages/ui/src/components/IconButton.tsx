import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/** 32×32 icon-only button. Always require `aria-label`. */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for accessibility — describes what the button does. */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'w-8 h-8 grid place-items-center rounded-lg text-[var(--ink-2)]',
        'hover:bg-[var(--panel-2)] hover:text-[var(--ink)] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
