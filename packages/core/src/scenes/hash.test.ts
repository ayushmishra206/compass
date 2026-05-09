import { describe, it, expect } from 'vitest';
import { hashSeed } from './hash.js';

describe('hashSeed (FNV-1a 32-bit)', () => {
  it('returns a non-negative 32-bit integer', () => {
    const h = hashSeed('hello');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it('is deterministic across calls', () => {
    expect(hashSeed('2026-05-03dawn')).toBe(hashSeed('2026-05-03dawn'));
  });

  it('produces different outputs for different inputs', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
    expect(hashSeed('2026-05-03dawn')).not.toBe(hashSeed('2026-05-03fog'));
  });

  it('hashes the empty string to the FNV-1a 32-bit offset basis', () => {
    expect(hashSeed('')).toBe(0x811c9dc5);
  });
});
