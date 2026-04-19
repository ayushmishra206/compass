import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

/** Hairline rule. */
export function Divider({ orientation = 'horizontal', className, ...rest }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'horizontal'
          ? 'h-px w-full bg-[var(--hair)]'
          : 'w-px h-full bg-[var(--hair)]',
        className,
      )}
      {...rest}
    />
  );
}
