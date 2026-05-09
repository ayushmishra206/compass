import type { AccentName } from '../tokens.js';

export type { AccentName };

/**
 * OKLCH triples for each accent. Applied to <html> via three CSS custom
 * properties so derived vars (--accent, --accent-soft, --accent-wash)
 * recompose at runtime without re-rendering primitives.
 */
export const ACCENTS: Readonly<Record<AccentName, { h: number; c: number; l: number }>> = {
  amber: { h: 28, c: 0.14, l: 0.65 },
  rose: { h: 18, c: 0.13, l: 0.66 },
  mint: { h: 160, c: 0.1, l: 0.7 },
  violet: { h: 285, c: 0.12, l: 0.68 },
  sky: { h: 230, c: 0.1, l: 0.7 },
} as const;

export function applyAccent(name: AccentName): void {
  const { h, c, l } = ACCENTS[name];
  const el = document.documentElement;
  el.style.setProperty('--accent-h', String(h));
  el.style.setProperty('--accent-c', String(c));
  el.style.setProperty('--accent-l', String(l));
}
