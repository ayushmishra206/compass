import { useCallback, useEffect, useState } from 'react';
import { rpc } from '@compass/runtime';
import type { CalendarEventRow } from '@compass/core';

export interface DayEvent {
  id: string;
  /** Local "HH:mm", which is what the timeline lays out against. */
  start: string;
  end: string;
  summary: string;
  isFocusBlock: boolean;
  hasConference: boolean;
  allDay: boolean;
}

export type CalendarState =
  | { kind: 'loading' }
  | { kind: 'not-connected' }
  | { kind: 'ready'; events: DayEvent[]; syncedAt: string | null }
  | { kind: 'error'; message: string };

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function startOfLocalDay(now: Date): { fromIso: string; toIso: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const to = new Date(from.getTime() + 86_400_000);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

export function toDayEvents(rows: CalendarEventRow[]): DayEvent[] {
  return rows
    .filter((r) => r.selfResponse !== 'declined')
    .map((r) => ({
      id: r.id,
      start: hhmm(r.startAt),
      end: hhmm(r.endAt),
      summary: r.summary || '(no title)',
      isFocusBlock: r.isFocusBlock,
      hasConference: r.hasConference,
      allDay: r.allDay,
    }));
}

/**
 * Today's calendar. Reads whatever is already stored first so the drawer paints
 * immediately, then kicks off a sync and re-reads. A failed sync leaves the
 * cached events on screen rather than blanking the day.
 */
export function useCalendar(): {
  state: CalendarState;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<CalendarState>({ kind: 'loading' });

  const read = useCallback(async (): Promise<DayEvent[]> => {
    const { fromIso, toIso } = startOfLocalDay(new Date());
    const res = await rpc('calendar.listRange', { fromIso, toIso });
    return toDayEvents(res.events);
  }, []);

  const load = useCallback(
    async (withSync: boolean) => {
      try {
        const status = await rpc('calendar.status', {});
        if (!status.connected) {
          setState({ kind: 'not-connected' });
          return;
        }

        setState({ kind: 'ready', events: await read(), syncedAt: null });

        if (!withSync) return;
        const sync = await rpc('calendar.sync', {});
        if (!sync.ok && sync.reason === 'not-connected') {
          setState({ kind: 'not-connected' });
          return;
        }
        setState({
          kind: 'ready',
          events: await read(),
          syncedAt: sync.ok ? new Date().toISOString() : null,
        });
      } catch (e) {
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    },
    [read],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { state, refresh };
}
