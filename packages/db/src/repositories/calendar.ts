import type { Db } from '../opfs';

export interface CalendarAttendee {
  email: string;
  isSelf: boolean;
  response: string | null;
}

export interface CalendarEventRow {
  id: string;
  calendarId: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  summary: string;
  location: string | null;
  hasConference: boolean;
  isFocusBlock: boolean;
  selfResponse: string | null;
  status: string;
  updatedAt: string;
  attendees: CalendarAttendee[];
}

export interface CalendarRepo {
  /** Insert-or-replace a synced batch. Attendees are replaced, not merged. */
  upsert(events: CalendarEventRow[], syncedAt: string): Promise<void>;
  /** Events overlapping-by-start in [fromIso, toIso). Cancelled ones are excluded. */
  listBetween(fromIso: string, toIso: string): Promise<CalendarEventRow[]>;
  remove(ids: string[]): Promise<void>;
  getSyncToken(calendarId: string): Promise<string | null>;
  setSyncToken(calendarId: string, token: string | null, at: string): Promise<void>;
  clearCalendar(calendarId: string): Promise<void>;
}

function placeholders(n: number): string {
  return new Array(n).fill('?').join(', ');
}

export function createCalendarRepo(db: Db): CalendarRepo {
  return {
    async upsert(events, syncedAt) {
      if (events.length === 0) return;
      for (const e of events) {
        db.exec({
          sql: `INSERT INTO calendar_events
                  (id, calendar_id, start_at, end_at, all_day, summary, location,
                   has_conference, is_focus_block, self_response, status, updated_at, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  calendar_id    = excluded.calendar_id,
                  start_at       = excluded.start_at,
                  end_at         = excluded.end_at,
                  all_day        = excluded.all_day,
                  summary        = excluded.summary,
                  location       = excluded.location,
                  has_conference = excluded.has_conference,
                  is_focus_block = excluded.is_focus_block,
                  self_response  = excluded.self_response,
                  status         = excluded.status,
                  updated_at     = excluded.updated_at,
                  synced_at      = excluded.synced_at`,
          bind: [
            e.id,
            e.calendarId,
            e.startAt,
            e.endAt,
            e.allDay ? 1 : 0,
            e.summary,
            e.location,
            e.hasConference ? 1 : 0,
            e.isFocusBlock ? 1 : 0,
            e.selfResponse,
            e.status,
            e.updatedAt,
            syncedAt,
          ],
        });

        // Google sends the full attendee list every time, so replace rather
        // than merge — a merge would resurrect attendees who were removed.
        db.exec({ sql: 'DELETE FROM calendar_attendees WHERE event_id = ?', bind: [e.id] });
        for (const a of e.attendees) {
          db.exec({
            sql: `INSERT INTO calendar_attendees (event_id, email, is_self, response)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(event_id, email) DO NOTHING`,
            bind: [e.id, a.email, a.isSelf ? 1 : 0, a.response],
          });
        }
      }
    },

    async listBetween(fromIso, toIso) {
      const rows = db.exec({
        sql: `SELECT id, calendar_id, start_at, end_at, all_day, summary, location,
                     has_conference, is_focus_block, self_response, status, updated_at
              FROM calendar_events
              WHERE start_at >= ? AND start_at < ? AND status != 'cancelled'
              ORDER BY start_at ASC`,
        bind: [fromIso, toIso],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;

      return rows.map((r) => {
        const id = r[0] as string;
        const attendeeRows = db.exec({
          sql: `SELECT email, is_self, response FROM calendar_attendees
                WHERE event_id = ? ORDER BY email ASC`,
          bind: [id],
          returnValue: 'resultRows',
        }) as Array<Array<unknown>>;

        return {
          id,
          calendarId: r[1] as string,
          startAt: r[2] as string,
          endAt: r[3] as string,
          allDay: r[4] === 1,
          summary: r[5] as string,
          location: (r[6] as string | null) ?? null,
          hasConference: r[7] === 1,
          isFocusBlock: r[8] === 1,
          selfResponse: (r[9] as string | null) ?? null,
          status: r[10] as string,
          updatedAt: r[11] as string,
          attendees: attendeeRows.map((a) => ({
            email: a[0] as string,
            isSelf: a[1] === 1,
            response: (a[2] as string | null) ?? null,
          })),
        };
      });
    },

    async remove(ids) {
      if (ids.length === 0) return;
      db.exec({
        sql: `DELETE FROM calendar_attendees WHERE event_id IN (${placeholders(ids.length)})`,
        bind: ids,
      });
      db.exec({
        sql: `DELETE FROM calendar_events WHERE id IN (${placeholders(ids.length)})`,
        bind: ids,
      });
    },

    async getSyncToken(calendarId) {
      const rows = db.exec({
        sql: 'SELECT sync_token FROM calendar_sync_state WHERE calendar_id = ?',
        bind: [calendarId],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return (rows[0]?.[0] as string | null) ?? null;
    },

    async setSyncToken(calendarId, token, at) {
      db.exec({
        sql: `INSERT INTO calendar_sync_state (calendar_id, sync_token, last_sync_at)
              VALUES (?, ?, ?)
              ON CONFLICT(calendar_id) DO UPDATE SET
                sync_token   = excluded.sync_token,
                last_sync_at = excluded.last_sync_at`,
        bind: [calendarId, token, at],
      });
    },

    async clearCalendar(calendarId) {
      db.exec({
        sql: `DELETE FROM calendar_attendees WHERE event_id IN
                (SELECT id FROM calendar_events WHERE calendar_id = ?)`,
        bind: [calendarId],
      });
      db.exec({ sql: 'DELETE FROM calendar_events WHERE calendar_id = ?', bind: [calendarId] });
    },
  };
}
