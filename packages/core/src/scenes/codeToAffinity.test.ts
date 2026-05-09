import { describe, it, expect } from 'vitest';
import { codeToAffinity } from './codeToAffinity.js';

describe('codeToAffinity (WMO → WxAffinity)', () => {
  it('maps clear-sky codes to "clear"', () => {
    expect(codeToAffinity(0)).toBe('clear');
    expect(codeToAffinity(1)).toBe('clear');
  });

  it('maps partly-cloudy + overcast to "cloudy"', () => {
    expect(codeToAffinity(2)).toBe('cloudy');
    expect(codeToAffinity(3)).toBe('cloudy');
  });

  it('maps fog codes to "fog"', () => {
    expect(codeToAffinity(45)).toBe('fog');
    expect(codeToAffinity(48)).toBe('fog');
  });

  it('maps drizzle + rain codes to "rain"', () => {
    expect(codeToAffinity(51)).toBe('rain');
    expect(codeToAffinity(63)).toBe('rain');
    expect(codeToAffinity(82)).toBe('rain');
  });

  it('maps snow codes to "snow"', () => {
    expect(codeToAffinity(71)).toBe('snow');
    expect(codeToAffinity(86)).toBe('snow');
  });

  it('maps thunderstorm codes to "storm"', () => {
    expect(codeToAffinity(95)).toBe('storm');
    expect(codeToAffinity(96)).toBe('storm');
    expect(codeToAffinity(99)).toBe('storm');
  });

  it('falls back to "cloudy" for unknown codes', () => {
    expect(codeToAffinity(42)).toBe('cloudy');
    expect(codeToAffinity(-1)).toBe('cloudy');
  });
});
