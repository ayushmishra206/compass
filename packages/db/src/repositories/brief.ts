import type { Db } from '../opfs';

export interface StoredBriefing {
  dateLocal: string;
  kind: 'morning' | 'eod';
  generatedAt: string;
  output: unknown;
  openedAt: string | null;
  userRating: -1 | 1 | null;
  providerUsed: string;
  costUsd: number;
}

export interface BriefRepo {
  getByDate(dateLocal: string, kind: 'morning' | 'eod'): Promise<StoredBriefing | null>;
  upsert(b: StoredBriefing): Promise<void>;
  recordOpen(dateLocal: string, kind: 'morning' | 'eod', at: string): Promise<void>;
  recordRating(dateLocal: string, kind: 'morning' | 'eod', rating: -1 | 1): Promise<void>;
  recentOpenStatus(daysBack: number): Promise<Array<{ dateLocal: string; opened: boolean }>>;
}

const SELECT_COLS =
  'date_local, kind, generated_at, output_json, opened_at, user_rating, provider_used, cost_usd';

function rowToStored(row: Array<unknown>): StoredBriefing {
  return {
    dateLocal: row[0] as string,
    kind: row[1] as 'morning' | 'eod',
    generatedAt: row[2] as string,
    output: JSON.parse(row[3] as string),
    openedAt: (row[4] as string | null) ?? null,
    userRating: row[5] === 1 || row[5] === -1 ? (row[5] as -1 | 1) : null,
    providerUsed: row[6] as string,
    costUsd: row[7] as number,
  };
}

export function createBriefRepo(db: Db): BriefRepo {
  return {
    async getByDate(dateLocal, kind) {
      const rows = db.exec({
        sql: `SELECT ${SELECT_COLS} FROM briefings WHERE date_local = ? AND kind = ?`,
        bind: [dateLocal, kind],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows[0] ? rowToStored(rows[0]) : null;
    },

    async upsert(b) {
      db.exec({
        sql: `INSERT INTO briefings (date_local, kind, generated_at, output_json, opened_at, user_rating, provider_used, cost_usd)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(date_local, kind) DO UPDATE SET
                generated_at = excluded.generated_at,
                output_json = excluded.output_json,
                opened_at = excluded.opened_at,
                user_rating = excluded.user_rating,
                provider_used = excluded.provider_used,
                cost_usd = excluded.cost_usd`,
        bind: [
          b.dateLocal,
          b.kind,
          b.generatedAt,
          JSON.stringify(b.output),
          b.openedAt,
          b.userRating,
          b.providerUsed,
          b.costUsd,
        ],
      });
    },

    async recordOpen(dateLocal, kind, at) {
      db.exec({
        sql: 'UPDATE briefings SET opened_at = ? WHERE date_local = ? AND kind = ?',
        bind: [at, dateLocal, kind],
      });
    },

    async recordRating(dateLocal, kind, rating) {
      db.exec({
        sql: 'UPDATE briefings SET user_rating = ? WHERE date_local = ? AND kind = ?',
        bind: [rating, dateLocal, kind],
      });
    },

    async recentOpenStatus(daysBack) {
      const rows = db.exec({
        sql: `SELECT date_local, opened_at FROM briefings
              WHERE kind = 'morning' AND date_local >= date('now', ?)
              ORDER BY date_local DESC`,
        bind: [`-${daysBack} days`],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows.map((r) => ({
        dateLocal: r[0] as string,
        opened: r[1] !== null,
      }));
    },
  };
}
