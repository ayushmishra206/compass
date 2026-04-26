/**
 * Compass design tokens — the TypeScript source of truth, mirrored by `theme.css`.
 *
 * Any change here that changes shape must also be reflected in `theme.css`, and
 * vice versa. The `tokens.test.ts` snapshot prevents silent drift.
 */

export const TOKENS = {
  color: {
    light: {
      bg: 'oklch(0.972 0.012 75)',
      'bg-deep': 'oklch(0.95 0.014 75)',
      panel: 'oklch(0.988 0.008 75)',
      'panel-2': 'oklch(0.965 0.011 75)',
      ink: 'oklch(0.22 0.015 55)',
      'ink-2': 'oklch(0.36 0.014 55)',
      'ink-3': 'oklch(0.52 0.012 55)',
      'ink-4': 'oklch(0.68 0.010 55)',
      hair: 'oklch(0.22 0.015 55 / 0.10)',
      'hair-2': 'oklch(0.22 0.015 55 / 0.18)',
      accent: 'oklch(var(--accent-l) var(--accent-c) var(--accent-h))',
      'accent-ink': 'oklch(0.34 var(--accent-c) var(--accent-h))',
      'accent-wash': 'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.10)',
      sage: 'oklch(0.55 0.05 150)',
      slate: 'oklch(0.52 0.03 255)',
    },
    dark: {
      bg: 'oklch(0.18 0.012 55)',
      'bg-deep': 'oklch(0.14 0.012 55)',
      panel: 'oklch(0.22 0.012 55)',
      'panel-2': 'oklch(0.26 0.012 55)',
      ink: 'oklch(0.94 0.010 75)',
      'ink-2': 'oklch(0.80 0.010 75)',
      'ink-3': 'oklch(0.64 0.010 75)',
      'ink-4': 'oklch(0.46 0.010 75)',
      hair: 'oklch(0.94 0.010 75 / 0.08)',
      'hair-2': 'oklch(0.94 0.010 75 / 0.16)',
      accent: 'oklch(var(--accent-l) var(--accent-c) var(--accent-h))',
      'accent-ink': 'oklch(0.78 var(--accent-c) var(--accent-h))',
      'accent-wash': 'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.18)',
      sage: 'oklch(0.78 0.06 150)',
      slate: 'oklch(0.78 0.05 255)',
    },
  },
  radius: { sm: 8, md: 14, lg: 22 },
  shadow: {
    'sh-1': '0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 1px 2px oklch(0.22 0.015 55 / 0.04)',
    'sh-2': '0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 12px 32px -12px oklch(0.22 0.015 55 / 0.18)',
    'sh-3': '0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 24px 64px -16px oklch(0.22 0.015 55 / 0.28)',
  },
  type: {
    serif: "'Newsreader', ui-serif, Georgia, serif",
    sans: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  motion: {
    duration: { fast: 120, mid: 220, slow: 400 },
    easing: { standard: 'cubic-bezier(0.2, 0, 0, 1)' },
  },
  density: {
    spacious: { sidebarW: 232, sidebarP: 18 },
    compact: { sidebarW: 64, sidebarP: 10 },
  },
} as const;

export type Tokens = typeof TOKENS;

/**
 * Accent swatches — each is an oklch `{h, c, l}` triple applied at runtime via CSS
 * custom properties (see `applyAccent`).
 */
export const ACCENTS = {
  terracotta: { h: 48, c: 0.13, l: 0.56 },
  ink: { h: 260, c: 0.04, l: 0.4 },
  sage: { h: 150, c: 0.06, l: 0.52 },
  ocean: { h: 230, c: 0.1, l: 0.52 },
  plum: { h: 340, c: 0.1, l: 0.52 },
} as const;

export type AccentName = keyof typeof ACCENTS;
export type AccentTriple = (typeof ACCENTS)[AccentName];
