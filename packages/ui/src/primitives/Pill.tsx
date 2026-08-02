import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../utils/cn.js';

export type PillTone = 'default' | 'accent' | 'red' | 'blue' | 'warn';
export type PillSize = 'sm' | 'md';

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  padding: '2px 6px',
  borderRadius: 3,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink-3)',
  border: '1px solid rgba(255,255,255,0.08)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: 500,
};

const sizeStyle: Record<PillSize, CSSProperties> = {
  sm: { fontSize: 9, padding: '2px 6px' },
  md: { fontSize: 11, padding: '6px 12px', borderRadius: 999 },
};

const toneStyle: Record<PillTone, CSSProperties> = {
  default: {},
  accent: {
    background: 'var(--accent-wash)',
    color: 'var(--accent-soft)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  red: {
    background: 'rgba(220,80,60,0.18)',
    color: 'oklch(0.82 0.13 30)',
    borderColor: 'rgba(220,80,60,0.25)',
  },
  blue: {
    background: 'rgba(80,140,220,0.18)',
    color: 'oklch(0.82 0.10 240)',
    borderColor: 'rgba(80,140,220,0.25)',
  },
  warn: {
    background: 'rgba(220,140,60,0.16)',
    color: 'oklch(0.82 0.12 70)',
    borderColor: 'rgba(220,140,60,0.25)',
  },
};

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLElement>, 'children'> {
  tone?: PillTone;
  size?: PillSize;
  selected?: boolean;
  as?: 'span' | 'button';
  leading?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
}

export const Pill = forwardRef<HTMLElement, PillProps>(function Pill(
  {
    tone = 'default',
    size = 'sm',
    selected,
    as,
    leading,
    trailing,
    className,
    style,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const Tag = (as ?? (onClick ? 'button' : 'span')) as 'span' | 'button';
  const merged: CSSProperties = {
    ...baseStyle,
    ...sizeStyle[size],
    ...toneStyle[tone],
    ...(selected ? { background: 'rgba(255,255,255,0.10)', color: 'var(--color-ink)' } : null),
    ...style,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = Tag as any;
  return (
    <Component
      ref={ref}
      className={cn('compass-pill', className)}
      data-tone={tone}
      data-size={size}
      data-selected={selected ? 'true' : undefined}
      style={merged}
      onClick={onClick}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </Component>
  );
});
