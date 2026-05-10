import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import type { Db } from '../../src/opfs';
import { createCostLedgerRepo, type CostLedgerRepo } from '../../src/repositories/costLedger';

let db: Db;
let repo: CostLedgerRepo;

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(db);
  repo = createCostLedgerRepo(db);
});

const sampleRow = (over: Partial<Parameters<CostLedgerRepo['recordRow']>[0]> = {}) => ({
  id: 'r1',
  ts: '2026-05-10T08:00:00Z',
  feature: 'brief.morning',
  provider: 'openrouter',
  model: 'claude-sonnet-4-6',
  promptTok: 1000,
  cachedTok: 800,
  completionTok: 200,
  usdEstimated: 0.0003,
  ...over,
});

describe('CostLedgerRepo', () => {
  it('recordRow inserts a row', async () => {
    await repo.recordRow(sampleRow());
    const spend = await repo.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.usd).toBeCloseTo(0.0003);
    expect(spend.calls).toBe(1);
  });

  it('monthlySpend sums cost across rows in the month', async () => {
    await repo.recordRow(sampleRow({ id: 'r1', ts: '2026-05-01T08:00:00Z', usdEstimated: 0.001 }));
    await repo.recordRow(sampleRow({ id: 'r2', ts: '2026-05-15T08:00:00Z', usdEstimated: 0.002 }));
    await repo.recordRow(sampleRow({ id: 'r3', ts: '2026-05-31T23:59:00Z', usdEstimated: 0.003 }));
    const spend = await repo.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.usd).toBeCloseTo(0.006);
    expect(spend.calls).toBe(3);
  });

  it('monthlySpend excludes rows from previous months', async () => {
    await repo.recordRow(
      sampleRow({ id: 'r-april', ts: '2026-04-15T08:00:00Z', usdEstimated: 0.01 }),
    );
    await repo.recordRow(
      sampleRow({ id: 'r-may', ts: '2026-05-01T08:00:00Z', usdEstimated: 0.005 }),
    );
    const spend = await repo.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.usd).toBeCloseTo(0.005);
    expect(spend.calls).toBe(1);
  });

  it('monthlySpend excludes rows from next month', async () => {
    await repo.recordRow(
      sampleRow({ id: 'r-may', ts: '2026-05-31T23:59:00Z', usdEstimated: 0.005 }),
    );
    await repo.recordRow(
      sampleRow({ id: 'r-june', ts: '2026-06-01T00:00:01Z', usdEstimated: 0.01 }),
    );
    const spend = await repo.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.usd).toBeCloseTo(0.005);
    expect(spend.calls).toBe(1);
  });
});
