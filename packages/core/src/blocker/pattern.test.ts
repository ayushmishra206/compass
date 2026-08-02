import { describe, expect, it } from 'vitest';
import { matchesPattern, normalizeBlockPattern } from './pattern';

describe('normalizeBlockPattern', () => {
  it('keeps a bare hostname', () => {
    expect(normalizeBlockPattern('reddit.com')).toBe('reddit.com');
  });

  it('strips a scheme', () => {
    expect(normalizeBlockPattern('https://reddit.com')).toBe('reddit.com');
  });

  it('strips a path, so no browsing detail is stored', () => {
    expect(normalizeBlockPattern('https://reddit.com/r/programming')).toBe('reddit.com');
  });

  it('strips a query and fragment', () => {
    expect(normalizeBlockPattern('reddit.com/search?q=secret#top')).toBe('reddit.com');
  });

  it('strips www so one site cannot be added twice', () => {
    expect(normalizeBlockPattern('www.reddit.com')).toBe('reddit.com');
    expect(normalizeBlockPattern('https://www.reddit.com/')).toBe('reddit.com');
  });

  it('strips a port', () => {
    expect(normalizeBlockPattern('localhost.dev:3000')).toBe('localhost.dev');
  });

  it('strips credentials', () => {
    expect(normalizeBlockPattern('https://user:pw@reddit.com')).toBe('reddit.com');
  });

  it('lowercases and trims', () => {
    expect(normalizeBlockPattern('  ReDDit.COM  ')).toBe('reddit.com');
  });

  it('keeps a subdomain the user explicitly asked for', () => {
    expect(normalizeBlockPattern('old.reddit.com')).toBe('old.reddit.com');
  });

  it('rejects empty input', () => {
    expect(normalizeBlockPattern('')).toBeNull();
    expect(normalizeBlockPattern('   ')).toBeNull();
  });

  it('rejects a bare word with no dot', () => {
    expect(normalizeBlockPattern('reddit')).toBeNull();
  });

  it('rejects wildcards rather than creating a broken rule', () => {
    expect(normalizeBlockPattern('*.reddit.com')).toBeNull();
    expect(normalizeBlockPattern('*')).toBeNull();
  });

  it('rejects an absurdly long host', () => {
    expect(normalizeBlockPattern(`${'a'.repeat(300)}.com`)).toBeNull();
  });
});

describe('matchesPattern', () => {
  it('matches the exact host', () => {
    expect(matchesPattern('reddit.com', 'reddit.com')).toBe(true);
  });

  it('matches subdomains', () => {
    expect(matchesPattern('old.reddit.com', 'reddit.com')).toBe(true);
  });

  it('ignores a www prefix on the visited host', () => {
    expect(matchesPattern('www.reddit.com', 'reddit.com')).toBe(true);
  });

  it('does not match a different site that merely ends similarly', () => {
    expect(matchesPattern('notreddit.com', 'reddit.com')).toBe(false);
  });

  it('does not match a parent when the rule targets a subdomain', () => {
    expect(matchesPattern('reddit.com', 'old.reddit.com')).toBe(false);
  });
});
