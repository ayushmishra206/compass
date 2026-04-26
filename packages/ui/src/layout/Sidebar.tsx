import { type ReactNode } from 'react';
import { cn } from '../utils/cn.js';
import { type Density } from '../theme/ThemeProvider.js';

export interface SidebarProps {
  brand: ReactNode;
  nav: ReactNode;
  footer?: ReactNode;
  density?: Density;
}

/**
 * Presentational sidebar shell — accepts brand, nav, and optional footer
 * slots. Compass-specific content (nav items, budget card) is composed in the
 * extension app, keeping this primitive feature-agnostic.
 */
export function Sidebar({ brand, nav, footer, density = 'spacious' }: SidebarProps) {
  const compact = density === 'compact';
  return (
    <aside
      data-density={density}
      className={cn(
        'sticky top-0 h-screen overflow-hidden flex flex-col gap-2.5 border-r border-[var(--hair)] bg-[var(--bg)]',
        compact ? 'px-2.5 py-5 items-center' : 'px-4 py-5',
      )}
    >
      {brand}
      <div className="flex flex-col gap-0.5">{nav}</div>
      {footer && <div className="mt-auto flex flex-col gap-2.5 p-2.5">{footer}</div>}
    </aside>
  );
}
