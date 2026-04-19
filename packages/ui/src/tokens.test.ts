import { describe, expect, it } from 'vitest';
import { TOKENS, ACCENTS } from './tokens.js';

describe('tokens', () => {
  it('exports all token families', () => {
    expect(TOKENS.color.light).toHaveProperty('bg');
    expect(TOKENS.color.dark).toHaveProperty('bg');
    expect(TOKENS.color.light).toHaveProperty('accent');
    expect(TOKENS.radius).toEqual({ sm: 8, md: 14, lg: 22 });
    expect(TOKENS.shadow).toHaveProperty('sh-1');
    expect(TOKENS.motion.duration).toEqual({ fast: 120, mid: 220, slow: 400 });
  });

  it('exports five named accents with {h,c,l}', () => {
    expect(Object.keys(ACCENTS)).toEqual(['terracotta', 'ink', 'sage', 'ocean', 'plum']);
    for (const v of Object.values(ACCENTS)) {
      expect(v).toMatchObject({
        h: expect.any(Number),
        c: expect.any(Number),
        l: expect.any(Number),
      });
    }
  });

  it('matches snapshot (drift guard vs theme.css)', () => {
    expect(TOKENS).toMatchSnapshot();
  });
});
