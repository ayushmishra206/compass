import { z } from 'zod';

/**
 * Canonical calendar event shape, shared by the Google sync layer that
 * produces it (`@compass/integrations`) and the store that persists it
 * (`@compass/db`). Living in core keeps integrations from depending on db.
 */

export const CalendarAttendeeSchema = z.object({
  email: z.string(),
  isSelf: z.boolean(),
  response: z.string().nullable(),
});
export type CalendarAttendee = z.infer<typeof CalendarAttendeeSchema>;

export const CalendarEventRowSchema = z.object({
  id: z.string(),
  calendarId: z.string(),
  /** UTC ISO-8601. All-day events anchor at UTC midnight. */
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean(),
  summary: z.string(),
  location: z.string().nullable(),
  hasConference: z.boolean(),
  isFocusBlock: z.boolean(),
  /** The signed-in user's own responseStatus, lifted for quick filtering. */
  selfResponse: z.string().nullable(),
  status: z.string(),
  updatedAt: z.string(),
  attendees: z.array(CalendarAttendeeSchema),
});
export type CalendarEventRow = z.infer<typeof CalendarEventRowSchema>;
