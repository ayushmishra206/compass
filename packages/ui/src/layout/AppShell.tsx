import { type ReactNode } from 'react';
import { type Density } from '../theme/ThemeProvider.js';

export interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  density?: Density;
}

/**
 * Top-level 2-column layout: `sidebar | main`. Column widths respond to
 * density: 232px spacious, 64px compact.
 */
export function AppShell({ sidebar, children, density = 'spacious' }: AppShellProps) {
  const cols = density === 'compact' ? '64px 1fr' : '232px 1fr';
  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: cols }} data-density={density}>
      {sidebar}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
