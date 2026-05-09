/**
 * Compass design tokens — Phase 1.6 "Momentum"
 *
 * Dark-only. No density modes. OKLCH color space.
 * The accent (h, c, l) triple is owned by ThemeProvider via three CSS custom
 * properties: --accent-h, --accent-c, --accent-l. The `--accent-*` derived
 * vars compose against those at runtime.
 *
 * Snapshot tested in tokens.test.ts; bump the snapshot when intentional.
 */

export const COLORS = {
  bg: '#0e0c0a',
  ink: '#f4ede2',
  ink2: 'rgba(244, 237, 226, 0.78)',
  ink3: 'rgba(244, 237, 226, 0.55)',
  ink4: 'rgba(244, 237, 226, 0.34)',
  hair: 'rgba(244, 237, 226, 0.12)',
  hair2: 'rgba(244, 237, 226, 0.22)',
  panel: 'rgba(20, 18, 16, 0.55)',
  panel2: 'rgba(28, 25, 22, 0.7)',
  glass1Tint: 'rgba(12, 10, 8, 0.55)',
  glass2Tint: 'rgba(18, 16, 14, 0.86)',
  glass3Tint: 'rgba(20, 18, 16, 0.92)',
} as const;

export const GLASS = {
  glass1: 'blur(20px) saturate(140%)',
  glass2: 'blur(28px) saturate(150%)',
  glass3: 'blur(32px)',
} as const;

export const RADII = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const SHADOWS = {
  sh1: '0 1px 4px rgba(0,0,0,0.35)',
  sh2: '0 8px 24px -8px rgba(0,0,0,0.5)',
  sh3: '0 30px 80px -20px rgba(0,0,0,0.7)',
} as const;

export const FONTS = {
  serif: '"Fraunces", ui-serif, Georgia, serif',
  sans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, Menlo, monospace',
} as const;

export const MOTION = {
  fast: 120,
  mid: 240,
  slow: 360,
  scenefade: 1200,
} as const;

export type AccentName = 'amber' | 'rose' | 'mint' | 'violet' | 'sky';
export const ACCENT_NAMES: readonly AccentName[] = [
  'amber',
  'rose',
  'mint',
  'violet',
  'sky',
] as const;
