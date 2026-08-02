import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn.js';

export type SurfaceTier = 1 | 2 | 3;
export type SurfaceRadius = 'sm' | 'md' | 'lg' | 'pill';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

const tierStyle: Record<SurfaceTier, CSSProperties> = {
  1: {
    background: 'var(--glass-tint-1)',
    backdropFilter: 'var(--glass-1)',
    WebkitBackdropFilter: 'var(--glass-1)',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  2: {
    background: 'var(--glass-tint-2)',
    backdropFilter: 'var(--glass-2)',
    WebkitBackdropFilter: 'var(--glass-2)',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  3: {
    background: 'var(--glass-tint-3)',
    backdropFilter: 'var(--glass-3)',
    WebkitBackdropFilter: 'var(--glass-3)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: 'var(--shadow-3)',
  },
};

const radiusValue: Record<SurfaceRadius, string> = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  pill: 'var(--radius-pill)',
};

const paddingValue: Record<SurfacePadding, string> = {
  none: '0',
  sm: 'var(--space-3)',
  md: 'var(--space-4)',
  lg: 'var(--space-5)',
};

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tier?: SurfaceTier;
  radius?: SurfaceRadius;
  padding?: SurfacePadding;
  children?: ReactNode;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { tier = 1, radius = 'lg', padding = 'md', className, style, children, ...rest },
  ref,
) {
  const merged: CSSProperties = {
    ...tierStyle[tier],
    borderRadius: radiusValue[radius],
    padding: paddingValue[padding],
    ...style,
  };
  return (
    <div
      ref={ref}
      className={cn('compass-surface', className)}
      data-tier={tier}
      style={merged}
      {...rest}
    >
      {children}
    </div>
  );
});
