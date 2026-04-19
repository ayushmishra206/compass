import { type ReactNode } from 'react';

export interface TopbarProps {
  breadcrumb: ReactNode;
  date?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
}

/** Sticky header: breadcrumb + optional date + search + action slots. */
export function Topbar({ breadcrumb, date, search, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3.5 px-8 py-3.5 border-b border-[var(--hair)] backdrop-blur-[10px] bg-[color-mix(in_oklch,var(--bg),transparent_20%)]">
      <div className="font-serif text-[18px] font-medium tracking-tight">{breadcrumb}</div>
      {date && <div className="font-mono text-[10px] text-[var(--ink-4)]">{date}</div>}
      {search && <div className="ml-auto">{search}</div>}
      {actions}
    </header>
  );
}
