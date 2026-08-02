import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import {
  createCalendarRepo,
  type CalendarRepo,
  type CalendarEventRow,
} from '../../src/repositories/calendar';
import type { Db } from '../../src/opfs';

let db: Db;
let repo: CalendarRepo;

const evt = (over: Partial<CalendarEventRow> = {}): CalendarEventRow => ({
  id: 'e1',
  calendarId: 'primary',
  startAt: '2026-08-02T09:00:00.000Z',
  endAt: '2026-08-02T10:00:00.000Z',
  allDay: false,
  summary: 'Standup',
  location: null,
  hasConference: true,
  isFocusBlock: false,
  selfResponse: 'accepted',
  status: 'confirmed',
  updatedAt: '2026-08-01T00:00:00.000Z',
  attendees: [{ email: 'a@example.com', isSelf: true, response: 'accepted' }],
  ...over,
});

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(db);
  repo = createCalendarRepo(db);
});

describe('upsert', () => {
  it('stores an event and reads it back', async () => {
    await repo.upsert([evt()], '2026-08-02T08:00:00.000Z');
    const rows = await repo.listBetween('2026-08-02T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.summary).toBe('Standup');
    expect(rows[0]?.hasConference).toBe(true);
  });

  it('is idempotent — re-syncing the same event does not duplicate it', async () => {
    await repo.upsert([evt()], '2026-08-02T08:00:00.000Z');
    await repo.upsert([evt()], '2026-08-02T08:05:00.000Z');
    const rows = await repo.listBetween('2026-08-02T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
    expect(rows).toHaveLength(1);
  });

  it('overwrites changed fields on re-sync', async () => {
    await repo.upsert([evt()], '2026-08-02T08:00:00.000Z');
    await repo.upsert([evt({ summary: 'Standup (moved)' })], '2026-08-02T08:05:00.000Z');
    const rows = await repo.listBetween('2026-08-02T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
    expect(rows[0]?.summary).toBe('Standup (moved)');
  });

  it('replaces attendees rather than accumulating them', async () => {
    await repo.upsert([evt()], '2026-08-02T08:00:00.000Z');
    await repo.upsert(
      [evt({ attendees: [{ email: 'b@example.com', isSelf: false, response: 'declined' }] })],
      '2026-08-02T08:05:00.000Z',
    );
    const rows = await repo.listBetween('2026-08-02T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
    expect(rows[0]?.attendees).toHaveLength(1);
    expect(rows[0]?.attendees[0]?.email).toBe('b@example.com');
  });

  it('handles an empty batch without error', async () => {
    await expect(repo.upsert([], '2026-08-02T08:00:00.000Z')).resolves.toBeUndefined();
  });
});

describe('listBetween', () => {
  beforeEach(async () => {
    await repo.upsert(
      [
        evt({
          id: 'early',
          startAt: '2026-08-02T06:00:00.000Z',
          endAt: '2026-08-02T07:00:00.000Z',
        }),
        evt({ id: 'mid', startAt: '2026-08-02T12:00:00.000Z', endAt: '2026-08-02T13:00:00.000Z' }),
        evt({
          id: 'tomorrow',
          startAt: '2026-08-03T09:00:00.000Z',
          endAt: '2026-08-03T10:00:00.000Z',
        }),
      ],
      '2026-08-02T05:00:00.000Z',
    );
  });

  it('returns only events inside the window', async () => {
    const rows = await repo.listBetween('2026-08-02T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
    expect(rows.map((r) => r.id)).toEqual(['early', 'mid']);
  });

  it('orders by start time ascending', async () => {
    const rows = await repo.listBetween('2026-08-01T00:00:00.000Z', '2026-08-04T00:00:00.000Z');
    expect(rows.map((r) => r.id)).toEqual(['early', 'mid', 'tomorrow']);
  });

  it('excludes cancelled events — they should not appear in a day view', async () => {
    await repo.upsert(
      [evt({ id: 'mid', status: 'cancelled', startAt: '2026-08-02T12:00:00.000Z' })],
      '2026-08-02T14:00:00.000Z',
    );
    const rows = await repo.listBetween('2026-08-02T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
    expect(rows.map((r) => r.id)).toEqual(['early']);
  });

  it('returns an empty array when nothing matches', async () => {
    expect(await repo.listBetween('2030-01-01T00:00:00.000Z', '2030-01-02T00:00:00.000Z')).toEqual(
      [],
    );
  });
});

describe('remove', () => {
  it('deletes events Google reported as cancelled', async () => {
    await repo.upsert([evt()], '2026-08-02T08:00:00.000Z');
    await repo.remove(['e1']);
    expect(
      await repo.listBetween('2026-08-02T00:00:00.000Z', '2026-08-03T00:00:00.000Z'),
    ).toHaveLength(0);
  });

  it('cascades to attendees, leaving no orphans', async () => {
    await repo.upsert([evt()], '2026-08-02T08:00:00.000Z');
    await repo.remove(['e1']);
    const orphans = db.exec({
      sql: 'SELECT COUNT(*) FROM calendar_attendees',
      returnValue: 'resultRows',
    }) as Array<Array<unknown>>;
    expect(orphans[0]?.[0]).toBe(0);
  });

  it('ignores ids that are not present', async () => {
    await expect(repo.remove(['nope'])).resolves.toBeUndefined();
  });
});

describe('sync state', () => {
  it('round-trips a sync token', async () => {
    await repo.setSyncToken('primary', 'TOKEN123', '2026-08-02T08:00:00.000Z');
    expect(await repo.getSyncToken('primary')).toBe('TOKEN123');
  });

  it('returns null for a calendar never synced', async () => {
    expect(await repo.getSyncToken('unknown')).toBeNull();
  });

  it('overwrites the token on a later sync', async () => {
    await repo.setSyncToken('primary', 'A', '2026-08-02T08:00:00.000Z');
    await repo.setSyncToken('primary', 'B', '2026-08-02T09:00:00.000Z');
    expect(await repo.getSyncToken('primary')).toBe('B');
  });

  it('clears the token when Google invalidates it', async () => {
    await repo.setSyncToken('primary', 'A', '2026-08-02T08:00:00.000Z');
    await repo.setSyncToken('primary', null, '2026-08-02T09:00:00.000Z');
    expect(await repo.getSyncToken('primary')).toBeNull();
  });
});

describe('clearCalendar', () => {
  it('drops every event so a full resync can start clean', async () => {
    await repo.upsert([evt({ id: 'a' }), evt({ id: 'b' })], '2026-08-02T08:00:00.000Z');
    await repo.clearCalendar('primary');
    expect(
      await repo.listBetween('2026-08-01T00:00:00.000Z', '2026-08-04T00:00:00.000Z'),
    ).toHaveLength(0);
  });

  it('leaves other calendars untouched', async () => {
    await repo.upsert(
      [evt({ id: 'a', calendarId: 'primary' }), evt({ id: 'b', calendarId: 'work' })],
      '2026-08-02T08:00:00.000Z',
    );
    await repo.clearCalendar('primary');
    const rows = await repo.listBetween('2026-08-01T00:00:00.000Z', '2026-08-04T00:00:00.000Z');
    expect(rows.map((r) => r.id)).toEqual(['b']);
  });
});
