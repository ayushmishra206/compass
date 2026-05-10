import type { Db } from '../opfs';

export interface CostLedgerRepo {
  recordRow(row: {
    id: string;
    ts: string;
    feature: string;
    provider: string;
    model: string;
    promptTok: number;
    cachedTok: number;
    completionTok: number;
    usdEstimated: number;
  }): Promise<void>;
  monthlySpend(monthStartIso: string): Promise<{ usd: number; calls: number }>;
}

export function createCostLedgerRepo(db: Db): CostLedgerRepo {
  return {
    async recordRow(r) {
      db.exec({
        sql: `INSERT INTO llm_cost_ledger (id, ts, feature, provider, model, prompt_tok, cached_tok, completion_tok, usd_estimated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          r.id,
          r.ts,
          r.feature,
          r.provider,
          r.model,
          r.promptTok,
          r.cachedTok,
          r.completionTok,
          r.usdEstimated,
        ],
      });
    },
    async monthlySpend(monthStartIso) {
      const start = new Date(monthStartIso);
      // Compute next-month-start by adding 1 to the month component (handles year wrap automatically).
      const nextMonth = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
      ).toISOString();
      const rows = db.exec({
        sql: `SELECT COALESCE(SUM(usd_estimated), 0), COUNT(*)
              FROM llm_cost_ledger
              WHERE ts >= ? AND ts < ?`,
        bind: [monthStartIso, nextMonth],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return {
        usd: (rows[0]?.[0] as number) ?? 0,
        calls: (rows[0]?.[1] as number) ?? 0,
      };
    },
  };
}
