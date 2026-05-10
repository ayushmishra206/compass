import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { relativeTime } from './relativeTime';

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns "just now" for under 60 seconds', () => {
    expect(relativeTime(new Date('2026-05-09T11:59:30Z'))).toBe('just now');
  });
  it('returns minutes for under 60 minutes', () => {
    expect(relativeTime(new Date('2026-05-09T11:55:00Z'))).toBe('5 minutes ago');
  });
  it('returns "1 minute ago" for exactly 1 minute', () => {
    expect(relativeTime(new Date('2026-05-09T11:59:00Z'))).toBe('1 minute ago');
  });
  it('returns hours for under 24 hours', () => {
    expect(relativeTime(new Date('2026-05-09T09:00:00Z'))).toBe('3 hours ago');
  });
  it('returns "1 hour ago" for exactly 1 hour', () => {
    expect(relativeTime(new Date('2026-05-09T11:00:00Z'))).toBe('1 hour ago');
  });
  it('returns days for older', () => {
    expect(relativeTime(new Date('2026-05-06T12:00:00Z'))).toBe('3 days ago');
  });
  it('returns "1 day ago" for exactly 24 hours', () => {
    expect(relativeTime(new Date('2026-05-08T12:00:00Z'))).toBe('1 day ago');
  });
  it('accepts ISO string input', () => {
    expect(relativeTime('2026-05-09T11:55:00Z')).toBe('5 minutes ago');
  });
});
