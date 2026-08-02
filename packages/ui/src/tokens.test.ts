import { describe, it, expect } from 'vitest';
import { COLORS, GLASS, RADII, SHADOWS, FONTS, MOTION, SPACE, ACCENT_NAMES } from './tokens.js';

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
    expect(MOTION.slideup).toBe(600);
  });

  it('exposes a 6-step spacing scale', () => {
    expect(SPACE).toEqual({ s1: 4, s2: 8, s3: 14, s4: 20, s5: 28, s6: 40 });
  });

  it('exposes the overlay-text and card shadow recipes', () => {
    expect(SHADOWS.overlayText).toContain('rgba(0, 0, 0, 0.6)');
    expect(SHADOWS.card).toContain('rgba(0, 0, 0, 0.5)');
  });
});
