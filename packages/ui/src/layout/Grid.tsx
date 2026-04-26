import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/** 12-column gap-22 grid. Consumers use Tailwind `col-span-N` on children. */
export function Grid12({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-12 gap-[22px]', className)} {...rest} />;
}
