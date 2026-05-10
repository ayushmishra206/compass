import { describe, it, expect } from 'vitest';
import { MIN_PASSPHRASE_LENGTH, passphraseStrength, passphraseError } from './passphrase';

describe('MIN_PASSPHRASE_LENGTH', () => {
  it('is 12', () => {
    expect(MIN_PASSPHRASE_LENGTH).toBe(12);
  });
});

describe('passphraseStrength', () => {
  it('returns weak for empty string', () => {
    expect(passphraseStrength('')).toBe('weak');
  });
  it('returns weak for 11 characters', () => {
    expect(passphraseStrength('a'.repeat(11))).toBe('weak');
  });
  it('returns medium at exactly 12 characters', () => {
    expect(passphraseStrength('a'.repeat(12))).toBe('medium');
  });
  it('returns medium at 19 characters', () => {
    expect(passphraseStrength('a'.repeat(19))).toBe('medium');
  });
  it('returns strong at 20 characters', () => {
    expect(passphraseStrength('a'.repeat(20))).toBe('strong');
  });
  it('returns strong for long passphrase', () => {
    expect(passphraseStrength('correct horse battery staple')).toBe('strong');
  });
});

describe('passphraseError', () => {
  it('returns error message when below minimum', () => {
    expect(passphraseError('short')).toBe('At least 12 characters.');
  });
  it('returns null at minimum length', () => {
    expect(passphraseError('a'.repeat(12))).toBeNull();
  });
  it('returns null for long passphrase', () => {
    expect(passphraseError('a'.repeat(50))).toBeNull();
  });
});
