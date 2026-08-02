import type { CalendarAttendee, CalendarEventRow } from '@compass/core';

/** The subset of Google Calendar API v3 `Event` that Compass reads. */
export interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  updated?: string;
  eventType?: string;
  hangoutLink?: string;
  conferenceData?: { conferenceId?: string };
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{
    email?: string;
    self?: boolean;
    displayName?: string;
    responseStatus?: string;
  }>;
}

/**
 * Titles that read as solo deep work. Only consulted when the user is the sole
 * attendee — a meeting called "deep work sync" is a meeting, not focus time.
 */
const FOCUS_TITLE = /\b(deep work|focus|heads[- ]down|no meetings|writing|maker time)\b/i;

export function isCancelled(e: GoogleEvent): boolean {
  return e.status === 'cancelled';
}

function toIso(slot: { dateTime?: string; date?: string } | undefined): string {
  if (slot?.dateTime) return new Date(slot.dateTime).toISOString();
  // All-day events carry a bare YYYY-MM-DD; anchor at UTC midnight so the
  // value is comparable against timed events in the same column.
  if (slot?.date) return new Date(`${slot.date}T00:00:00.000Z`).toISOString();
  return new Date(0).toISOString();
}

export function mapGoogleEvent(
  e: GoogleEvent,
  calendarId: string,
  selfEmail: string,
): CalendarEventRow {
  const selfLower = selfEmail.toLowerCase();

  const attendees: CalendarAttendee[] = (e.attendees ?? [])
    // Resource rows (meeting rooms) arrive with a displayName and no email.
    .filter((a): a is { email: string; self?: boolean; responseStatus?: string } => !!a.email)
    .map((a) => ({
      email: a.email,
      isSelf: a.self === true || a.email.toLowerCase() === selfLower,
      response: a.responseStatus ?? null,
    }));

  const self = attendees.find((a) => a.isSelf);
  const others = attendees.filter((a) => !a.isSelf);
  const summary = e.summary ?? '';

  const isFocusBlock =
    e.eventType === 'focusTime' || (others.length === 0 && FOCUS_TITLE.test(summary));

  return {
    id: e.id,
    calendarId,
    startAt: toIso(e.start),
    endAt: toIso(e.end),
    allDay: !!e.start?.date && !e.start?.dateTime,
    summary,
    location: e.location ?? null,
    hasConference: !!e.hangoutLink || !!e.conferenceData?.conferenceId,
    isFocusBlock,
    selfResponse: self?.response ?? null,
    status: e.status ?? 'confirmed',
    updatedAt: e.updated ?? new Date(0).toISOString(),
    attendees,
  };
}
