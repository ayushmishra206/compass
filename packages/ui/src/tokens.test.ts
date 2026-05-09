import { describe, it, expect } from 'vitest';
import { COLORS, GLASS, RADII, SHADOWS, FONTS, MOTION, ACCENT_NAMES } from './tokens.js';

describe('tokens', () => {
  it('exposes the dark-only color ramp', () => {
    expect(COLORS).toMatchObject({
      bg: '#0e0c0a',
      ink: '#f4ede2',
    });
    expect(Object.keys(COLORS).length).toBe(12);
  });

  it('exposes three glass tiers', () => {
    expect(GLASS.glass1).toContain('blur(20px)');
    expect(GLASS.glass2).toContain('blur(28px)');
    expect(GLASS.glass3).toContain('blur(32px)');
  });

  it('exposes Fraunces serif + Geist sans + Geist Mono', () => {
    expect(FONTS.serif).toContain('Fraunces');
    expect(FONTS.sans).toContain('Geist');
    expect(FONTS.mono).toContain('Geist Mono');
  });

  it('lists the five accents in canonical order', () => {
    expect(ACCENT_NAMES).toEqual(['amber', 'rose', 'mint', 'violet', 'sky']);
  });

  it('exposes radius + shadow + motion tokens', () => {
    expect(RADII.lg).toBe(20);
    expect(SHADOWS.sh3).toContain('rgba(0,0,0,0.7)');
    expect(MOTION.scenefade).toBe(1200);
  });
});
