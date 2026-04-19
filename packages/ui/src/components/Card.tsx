import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Apply the 22px inset padding. */
  padded?: boolean;
}

/** Panel surface with a hairline and soft shadow. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padded, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-[var(--panel)] border border-[var(--hair)] rounded-[14px] shadow-[var(--sh-1)]',
        padded && 'p-[22px]',
        className,
      )}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-[22px] py-3.5 border-b border-[var(--hair)]',
        className,
      )}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[22px]', className)} {...rest} />;
}
