import { cn } from '../utils/cn.js';

export interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * The Compass logo — a terracotta disc with a dark gap, rendered via CSS
 * gradients. Decorative by default (`aria-hidden`).
 */
export function BrandMark({ size = 26, className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-block rounded-full', className)}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 35% 35%, oklch(0.98 0.02 75), oklch(0.85 0.07 60) 60%, oklch(0.52 0.14 40) 100%)',
        boxShadow:
          'inset 0 0 0 1px oklch(0.22 0.015 55 / 0.2), 0 1px 2px oklch(0.22 0.015 55 / 0.2)',
      }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 225deg, transparent 0 40%, oklch(0.22 0.015 55 / 0.55) 40% 50%, transparent 50% 100%)',
          maskImage:
            'radial-gradient(circle, transparent 35%, #000 36%, #000 52%, transparent 53%)',
          WebkitMaskImage:
            'radial-gradient(circle, transparent 35%, #000 36%, #000 52%, transparent 53%)',
        }}
      />
    </span>
  );
}
