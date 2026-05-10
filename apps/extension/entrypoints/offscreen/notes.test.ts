import { describe, it, expect } from 'vitest';
import { chunkNote, headingsOf, isMinorEdit } from './notes';

describe('chunkNote', () => {
  it('returns one chunk for short bodies', () => {
    expect(chunkNote('Title', 'short body')).toEqual(['Title\n\nshort body']);
  });

  it('chunks long body into multiple windows', () => {
    const long = 'a'.repeat(1600);
    const out = chunkNote('T', long);
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) expect(c.length).toBeLessThanOrEqual(1300);
  });

  it('uses headings as natural splits', () => {
    const body = '# Section A\n' + 'a'.repeat(800) + '\n# Section B\n' + 'b'.repeat(800);
    const out = chunkNote('T', body);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[0]).toContain('Section A');
    expect(out.some((c) => c.includes('Section B'))).toBe(true);
  });
});

describe('headingsOf', () => {
  it('extracts ATX headings preserving order', () => {
    expect(headingsOf('# A\nfoo\n## B\nbar')).toEqual(['# A', '## B']);
  });
});

describe('isMinorEdit', () => {
  it('returns true when body diff < 50 chars and headings unchanged', () => {
    expect(isMinorEdit('# A\nfoo bar baz', '# A\nfoo bar bazz')).toBe(true);
  });
  it('returns false when a heading was added', () => {
    expect(isMinorEdit('# A\nfoo bar baz', '# A\nfoo bar baz\n# B\nx')).toBe(false);
  });
  it('returns false when body diff ≥ 50 chars', () => {
    expect(isMinorEdit('# A\nfoo', '# A\n' + 'x'.repeat(60))).toBe(false);
  });
});
