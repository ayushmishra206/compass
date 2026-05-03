import { describe, it, expect } from 'vitest';
import { MeetingPrepSchema } from './meeting';

describe('MeetingPrep schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = MeetingPrepSchema.safeParse({
      id: 'mp1',
      eventId: 'event123',
      generatedAt: '2026-04-26T14:00:00Z',
      attendeesContext: [],
      relevantNoteIds: [],
      relevantEmailIds: [],
      pastMeetingIds: [],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(MeetingPrepSchema.safeParse({ id: 'mp1' }).success).toBe(false);
  });
});
