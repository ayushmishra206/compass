import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn.js';

/**
 * Button — primary interactive element.
 *
 * Variants:
 * - `default` — panel surface with hairline; the sidebar's typical CTA.
 * - `primary` — inked button, used for destructive or confirming actions.
 * - `accent`  — filled with the current accent color.
 * - `ghost`   — transparent, borderless; inline in typography.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. */
  variant?: 'default' | 'primary' | 'accent' | 'ghost';
  /** Size ramp. */
  size?: 'xs' | 'sm' | 'md';
  /** Left slot, typically an icon. */
  leading?: ReactNode;
  /** Right slot, typically a chevron. */
  trailing?: ReactNode;
}

const base =
  'inline-flex items-center gap-2 font-medium transition-colors active:translate-y-[0.5px] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-[var(--bg)] disabled:opacity-50 disabled:cursor-not-allowed';

const sizeCls: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'px-2 py-[3px] text-[11px] rounded-md',
  sm: 'px-2.5 py-[5px] text-[12px] rounded-lg',
  md: 'px-3.5 py-2 text-[13px] rounded-[10px]',
};

const variantCls: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-[var(--panel)] text-[var(--ink)] border border-[var(--hair)] ' +
    'hover:bg-[var(--panel-2)] hover:border-[var(--hair-2)]',
  primary:
    'bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)] ' +
    'hover:bg-[oklch(0.14_0.015_55)] hover:border-[oklch(0.14_0.015_55)]',
  accent: 'bg-[var(--accent)] text-white border border-transparent hover:brightness-105',
  ghost: 'bg-transparent text-[var(--ink)] border border-transparent hover:bg-[var(--panel-2)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', leading, trailing, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      data-variant={variant}
      data-size={size}
      className={cn(base, sizeCls[size], variantCls[variant], className)}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
});
