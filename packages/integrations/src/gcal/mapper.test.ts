import { describe, expect, it } from 'vitest';
import { isCancelled, mapGoogleEvent, type GoogleEvent } from './mapper';

const base: GoogleEvent = {
  id: 'evt1',
  status: 'confirmed',
  summary: 'Design review',
  updated: '2026-08-01T12:00:00.000Z',
  start: { dateTime: '2026-08-02T09:00:00+05:30' },
  end: { dateTime: '2026-08-02T10:00:00+05:30' },
};

describe('mapGoogleEvent', () => {
  it('normalises timed events to UTC ISO strings', () => {
    const e = mapGoogleEvent(base, 'primary', 'me@example.com');
    expect(e.startAt).toBe('2026-08-02T03:30:00.000Z');
    expect(e.endAt).toBe('2026-08-02T04:30:00.000Z');
    expect(e.allDay).toBe(false);
  });

  it('treats a date-only event as all-day', () => {
    const e = mapGoogleEvent(
      { ...base, start: { date: '2026-08-02' }, end: { date: '2026-08-03' } },
      'primary',
      'me@example.com',
    );
    expect(e.allDay).toBe(true);
    expect(e.startAt).toBe('2026-08-02T00:00:00.000Z');
  });

  it('falls back to an empty summary for events with none', () => {
    const { summary, ...noSummary } = base;
    void summary;
    expect(mapGoogleEvent(noSummary, 'primary', 'me@example.com').summary).toBe('');
  });

  it('carries the calendar id through', () => {
    expect(mapGoogleEvent(base, 'work@example.com', 'me@example.com').calendarId).toBe(
      'work@example.com',
    );
  });
});

describe('conference detection', () => {
  it('flags an event carrying conference data', () => {
    const e = mapGoogleEvent(
      { ...base, conferenceData: { conferenceId: 'abc-defg-hij' } },
      'primary',
      'me@example.com',
    );
    expect(e.hasConference).toBe(true);
  });

  it('flags an event with only a hangout link', () => {
    const e = mapGoogleEvent(
      { ...base, hangoutLink: 'https://meet.google.com/abc-defg-hij' },
      'primary',
      'me@example.com',
    );
    expect(e.hasConference).toBe(true);
  });

  it('does not flag a plain event', () => {
    expect(mapGoogleEvent(base, 'primary', 'me@example.com').hasConference).toBe(false);
  });
});

describe('focus block detection', () => {
  it('trusts Google eventType=focusTime', () => {
    const e = mapGoogleEvent({ ...base, eventType: 'focusTime' }, 'primary', 'me@example.com');
    expect(e.isFocusBlock).toBe(true);
  });

  it('does not treat outOfOffice as focus time', () => {
    const e = mapGoogleEvent({ ...base, eventType: 'outOfOffice' }, 'primary', 'me@example.com');
    expect(e.isFocusBlock).toBe(false);
  });

  it('treats a solo event with a focus-shaped title as a focus block', () => {
    const e = mapGoogleEvent(
      { ...base, summary: 'Deep work — auth refactor', attendees: [] },
      'primary',
      'me@example.com',
    );
    expect(e.isFocusBlock).toBe(true);
  });

  it('does not infer focus from the title when others are invited', () => {
    const e = mapGoogleEvent(
      {
        ...base,
        summary: 'Deep work sync',
        attendees: [{ email: 'me@example.com', self: true }, { email: 'other@example.com' }],
      },
      'primary',
      'me@example.com',
    );
    expect(e.isFocusBlock).toBe(false);
  });

  it('leaves an ordinary solo event alone', () => {
    const e = mapGoogleEvent({ ...base, summary: 'Dentist' }, 'primary', 'me@example.com');
    expect(e.isFocusBlock).toBe(false);
  });
});

describe('attendees', () => {
  it('maps attendees with response status', () => {
    const e = mapGoogleEvent(
      {
        ...base,
        attendees: [
          { email: 'me@example.com', self: true, responseStatus: 'accepted' },
          { email: 'them@example.com', responseStatus: 'tentative' },
        ],
      },
      'primary',
      'me@example.com',
    );
    expect(e.attendees).toHaveLength(2);
    expect(e.attendees[0]).toEqual({ email: 'me@example.com', isSelf: true, response: 'accepted' });
  });

  it('identifies self by email when Google omits the self flag', () => {
    const e = mapGoogleEvent(
      { ...base, attendees: [{ email: 'ME@example.com', responseStatus: 'accepted' }] },
      'primary',
      'me@example.com',
    );
    expect(e.attendees[0]?.isSelf).toBe(true);
  });

  it('lifts the self response onto the event for quick filtering', () => {
    const e = mapGoogleEvent(
      { ...base, attendees: [{ email: 'me@example.com', self: true, responseStatus: 'declined' }] },
      'primary',
      'me@example.com',
    );
    expect(e.selfResponse).toBe('declined');
  });

  it('leaves selfResponse null when the user is not an attendee', () => {
    const e = mapGoogleEvent(
      { ...base, attendees: [{ email: 'them@example.com' }] },
      'primary',
      'me@example.com',
    );
    expect(e.selfResponse).toBeNull();
  });

  it('defaults to an empty attendee list', () => {
    expect(mapGoogleEvent(base, 'primary', 'me@example.com').attendees).toEqual([]);
  });

  it('drops attendees with no email — resource rooms arrive that way', () => {
    const e = mapGoogleEvent(
      { ...base, attendees: [{ displayName: 'Room 4' }, { email: 'x@example.com' }] },
      'primary',
      'me@example.com',
    );
    expect(e.attendees.map((a) => a.email)).toEqual(['x@example.com']);
  });
});

describe('isCancelled', () => {
  it('detects the tombstone Google sends for deleted events', () => {
    expect(isCancelled({ id: 'x', status: 'cancelled' })).toBe(true);
  });

  it('is false for a live event', () => {
    expect(isCancelled(base)).toBe(false);
  });
});
