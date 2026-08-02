import { cn } from '../utils/cn.js';

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  'aria-label': string;
  className?: string;
}

/** Segmented control — a radio-group styled as a pill row. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ...aria
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      {...aria}
      className={cn(
        'inline-flex bg-[var(--color-panel-2)] border border-[var(--color-hair)] rounded-lg p-0.5',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-2.5 py-1 text-[11.5px] rounded-md transition-colors',
              active
                ? 'bg-[var(--color-panel)] text-[var(--color-ink)] shadow-[var(--shadow-1)]'
                : 'text-[var(--color-ink-3)]',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
