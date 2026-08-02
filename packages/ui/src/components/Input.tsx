import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Use mono font (e.g. for API keys). */
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { mono, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2.5 bg-[var(--color-panel-2)] border border-[var(--color-hair)] rounded-[10px]',
        'text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-4)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-transparent',
        mono && 'font-mono',
        className,
      )}
      {...rest}
    />
  );
});
