import { getDb } from '@compass/db';
import { CostLedgerRowSchema, type CostLedgerRow } from '@compass/core';

export async function recordCall(row: Omit<CostLedgerRow, 'id'>): Promise<void> {
  const validated = CostLedgerRowSchema.parse({ ...row, id: crypto.randomUUID() });
  const db = await getDb();
  db.exec({
    sql: `INSERT INTO llm_cost_ledger
          (id, ts, feature, provider, model, prompt_tok, cached_tok, completion_tok, usd_estimated)
          VALUES ($id, $ts, $feature, $provider, $model, $prompt_tok, $cached_tok, $completion_tok, $usd_estimated)`,
    bind: {
      $id: validated.id,
      $ts: validated.ts,
      $feature: validated.feature,
      $provider: validated.provider,
      $model: validated.model,
      $prompt_tok: validated.promptTok,
      $cached_tok: validated.cachedTok,
      $completion_tok: validated.completionTok,
      $usd_estimated: validated.usdEstimated,
    },
  });
}

export async function getMonthlySpend(opts: {
  monthStartIso: string;
}): Promise<{ usd: number; calls: number }> {
  const db = await getDb();
  const rows = db.exec({
    sql: `SELECT COALESCE(SUM(usd_estimated), 0) AS usd, COUNT(*) AS calls
          FROM llm_cost_ledger
          WHERE ts >= $start`,
    bind: { $start: opts.monthStartIso },
    returnValue: 'resultRows',
  }) as Array<[number, number]>;
  return { usd: rows[0]?.[0] ?? 0, calls: rows[0]?.[1] ?? 0 };
}
