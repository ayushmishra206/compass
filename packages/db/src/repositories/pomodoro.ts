import type { Db } from '../opfs';

export interface FocusSummary14d {
  totalFocusMin: number;
  peakHourLocal: number | null;
  avgInterruptPerSession: number;
  trend: 'improving' | 'flat' | 'declining';
}

export interface PomodoroRepo {
  start(input: { id: string; durationMin: number; theme?: string }): Promise<void>;
  complete(id: string): Promise<void>;
  abandon(id: string): Promise<void>;
  summarize14d(now: Date): Promise<FocusSummary14d>;
}

export function createPomodoroRepo(db: Db): PomodoroRepo {
  return {
    async start({ id, durationMin, theme }) {
      db.exec({
        sql: `INSERT INTO pomodoros (id, started_at, duration_min, theme) VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO NOTHING`,
        bind: [id, new Date().toISOString(), durationMin, theme ?? null],
      });
    },
    async complete(id) {
      db.exec({
        sql: 'UPDATE pomodoros SET ended_at = ?, completed = 1 WHERE id = ?',
        bind: [new Date().toISOString(), id],
      });
    },
    async abandon(id) {
      db.exec({
        sql: 'UPDATE pomodoros SET ended_at = ?, completed = 0 WHERE id = ?',
        bind: [new Date().toISOString(), id],
      });
    },
    async summarize14d(now) {
      const cutoff14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const totalRows = db.exec({
        sql: `SELECT COALESCE(SUM(duration_min), 0), COALESCE(AVG(interrupt_count), 0), COUNT(*)
              FROM pomodoros WHERE completed = 1 AND started_at >= ?`,
        bind: [cutoff14],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      const totalFocusMin = (totalRows[0]?.[0] as number) ?? 0;
      const avgInt = (totalRows[0]?.[1] as number) ?? 0;

      const peakRows = db.exec({
        sql: `SELECT CAST(strftime('%H', started_at, 'localtime') AS INTEGER), COUNT(*)
              FROM pomodoros WHERE completed = 1 AND started_at >= ?
              GROUP BY CAST(strftime('%H', started_at, 'localtime') AS INTEGER)
              ORDER BY COUNT(*) DESC LIMIT 1`,
        bind: [cutoff14],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      const peakHourLocal = peakRows[0] ? (peakRows[0][0] as number) : null;

      const last7 = db.exec({
        sql: `SELECT COALESCE(SUM(duration_min), 0) FROM pomodoros
              WHERE completed = 1 AND started_at >= ?`,
        bind: [cutoff7],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      const prior7 = db.exec({
        sql: `SELECT COALESCE(SUM(duration_min), 0) FROM pomodoros
              WHERE completed = 1 AND started_at >= ? AND started_at < ?`,
        bind: [cutoff14, cutoff7],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      const cur = (last7[0]?.[0] as number) ?? 0;
      const prev = (prior7[0]?.[0] as number) ?? 0;
      let trend: 'improving' | 'flat' | 'declining' = 'flat';
      if (prev > 0) {
        if (cur >= prev * 1.1) trend = 'improving';
        else if (cur <= prev * 0.9) trend = 'declining';
      }

      return { totalFocusMin, peakHourLocal, avgInterruptPerSession: avgInt, trend };
    },
  };
}
