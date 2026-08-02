import { describe, expect, it } from 'vitest';
import { toDayEvents } from './useCalendar';
import type { CalendarEventRow } from '@compass/core';

const row = (over: Partial<CalendarEventRow> = {}): CalendarEventRow => ({
  id: 'e1',
  calendarId: 'primary',
  startAt: '2026-08-02T09:00:00.000Z',
  endAt: '2026-08-02T10:00:00.000Z',
  allDay: false,
  summary: 'Design review',
  location: null,
  hasConference: false,
  isFocusBlock: false,
  selfResponse: 'accepted',
  status: 'confirmed',
  updatedAt: '2026-08-01T00:00:00.000Z',
  attendees: [],
  ...over,
});

describe('toDayEvents', () => {
  it('formats start and end as local HH:mm', () => {
    const [e] = toDayEvents([row()]);
    expect(e?.start).toMatch(/^\d{2}:\d{2}$/);
    expect(e?.end).toMatch(/^\d{2}:\d{2}$/);
  });

  it('hides meetings the user declined', () => {
    const events = toDayEvents([row({ selfResponse: 'declined' }), row({ id: 'keep' })]);
    expect(events.map((e) => e.id)).toEqual(['keep']);
  });

  it('keeps meetings with no response — undecided is still on the calendar', () => {
    expect(toDayEvents([row({ selfResponse: null })])).toHaveLength(1);
  });

  it('gives untitled events a readable placeholder', () => {
    expect(toDayEvents([row({ summary: '' })])[0]?.summary).toBe('(no title)');
  });

  it('carries focus and conference flags through', () => {
    const [e] = toDayEvents([row({ isFocusBlock: true, hasConference: true })]);
    expect(e?.isFocusBlock).toBe(true);
    expect(e?.hasConference).toBe(true);
  });

  it('returns an empty list for an empty day', () => {
    expect(toDayEvents([])).toEqual([]);
  });
});
