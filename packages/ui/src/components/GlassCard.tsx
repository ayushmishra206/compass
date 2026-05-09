import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Glass tier — 1 light, 2 medium, 3 heavy. Default 1. */
  tier?: 1 | 2 | 3;
  children: ReactNode;
}

const tints = ['var(--glass-tint-1)', 'var(--glass-tint-2)', 'var(--glass-tint-3)'];
const filters = ['var(--glass-1)', 'var(--glass-2)', 'var(--glass-3)'];

export function GlassCard({ tier = 1, className = '', style, children, ...rest }: GlassCardProps) {
  const merged: CSSProperties = {
    background: tints[tier - 1],
    backdropFilter: filters[tier - 1],
    WebkitBackdropFilter: filters[tier - 1],
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 'var(--radius-lg)',
    ...style,
  };
  return (
    <div className={`glass-card ${className}`.trim()} style={merged} {...rest}>
      {children}
    </div>
  );
}
