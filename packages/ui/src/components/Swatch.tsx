import { cn } from '../utils/cn.js';

export interface SwatchProps {
  /** oklch() color string. */
  color: string;
  active?: boolean;
  onClick?: () => void;
  label?: string;
}

/** Circular color disc used in the accent picker. */
export function Swatch({ color, active, onClick, label }: SwatchProps) {
  return (
    <button
      aria-label={label ?? 'color swatch'}
      aria-pressed={!!active}
      onClick={onClick}
      className={cn(
        'w-5 h-5 rounded-full border-[1.5px] transition-transform hover:scale-110',
        active ? 'border-[var(--ink)]' : 'border-transparent',
      )}
      style={{ background: color }}
    />
  );
}
