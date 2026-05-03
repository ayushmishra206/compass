import { describe, it, expect } from 'vitest';
import { UserProfileSchema } from './user';

describe('UserProfile schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = UserProfileSchema.safeParse({
      id: 'u1',
      createdAt: '2026-01-01T00:00:00Z',
      timezone: 'UTC',
      locale: 'en-US',
      workHours: { start: '09:00', end: '17:00' },
      briefingHour: 8,
      reflectionHour: 18,
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(UserProfileSchema.safeParse({ id: 'u1' }).success).toBe(false);
  });
});
