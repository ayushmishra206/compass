import { cn } from '../utils/cn.js';

/** 14px concentric loading ring. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block w-3.5 h-3.5 rounded-full border-[1.5px] border-[var(--hair-2)]',
        'border-t-[var(--accent)] animate-[spin_0.9s_linear_infinite]',
        className,
      )}
    />
  );
}
