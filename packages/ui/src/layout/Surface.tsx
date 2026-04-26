import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/**
 * Inset content wrapper used by every surface. Sets the canonical page
 * padding (28/32/64) and max-width (1180).
 */
export function Surface({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-8 pb-16 pt-7 max-w-[1180px] mx-auto', className)} {...rest} />;
}
