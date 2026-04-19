import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { mono, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[80px] resize-y px-3 py-2.5 bg-[var(--panel-2)] border border-[var(--hair)] rounded-[10px]',
        'text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-4)] leading-[1.5]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-transparent',
        mono && 'font-mono',
        className,
      )}
      {...rest}
    />
  );
});
