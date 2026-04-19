import { cn } from '../utils/cn.js';

export interface ProgressProps {
  /** 0..1, clamped. */
  value: number;
  className?: string;
  label?: string;
}

export function Progress({ value, className, label }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'progress'}
      className={cn('h-1 bg-[var(--hair)] rounded-full overflow-hidden', className)}
    >
      <span className="block h-full bg-[var(--accent)] rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}
