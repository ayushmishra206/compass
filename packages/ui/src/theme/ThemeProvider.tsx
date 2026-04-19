import { useEffect, type ReactNode } from 'react';
import { applyAccent, type AccentName } from './accents.js';

export type Theme = 'light' | 'dark';
export type Density = 'spacious' | 'compact';

export interface ThemeProviderProps {
  theme: Theme;
  accent: AccentName;
  density: Density;
  children: ReactNode;
}

/**
 * Applies theme + accent + density as `data-*` attributes and CSS custom
 * properties on `<html>`. Children render unchanged — the provider owns no
 * state; the shell store is authoritative.
 */
export function ThemeProvider({ theme, accent, density, children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);
  useEffect(() => {
    document.documentElement.dataset['density'] = density;
  }, [density]);
  return <>{children}</>;
}
