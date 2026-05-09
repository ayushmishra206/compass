import { useEffect, type ReactNode } from 'react';
import { applyAccent, type AccentName } from './accents.js';

export interface ThemeProviderProps {
  accent: AccentName;
  children: ReactNode;
}

/**
 * Applies the current accent's OKLCH triple to <html> as CSS custom
 * properties. Owns no other theme state — the shell is dark-only,
 * single-density.
 */
export function ThemeProvider({ accent, children }: ThemeProviderProps) {
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);
  return <>{children}</>;
}
