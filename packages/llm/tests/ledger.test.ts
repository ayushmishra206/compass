import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '@compass/db';
import type { Db } from '@compass/db';

// Stub @compass/db's getDb with our in-memory test DB

let testDb: Db | null;

vi.mock('@compass/db', async (importOriginal) => {
  const actual = (await importOriginal()) as { runMigrations: typeof runMigrations };
  return {
    ...actual,
    getDb: async () => testDb,
  };
});

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testDb = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(testDb!);
});

afterEach(() => {
  testDb?.close();
});

describe('cost ledger', () => {
  it('records a call and getMonthlySpend sums', async () => {
    const { recordCall, getMonthlySpend } = await import('../src/ledger');
    await recordCall({
      ts: '2026-04-26T10:00:00Z',
      feature: 'system.ping',
      provider: 'openrouter',
      model: 'anthropic/claude-haiku-4-5',
      promptTok: 50,
      cachedTok: 0,
      completionTok: 20,
      usdEstimated: 0.0001,
    });
    const sum = await getMonthlySpend({ monthStartIso: '2026-04-01T00:00:00Z' });
    expect(sum.usd).toBeCloseTo(0.0001);
    expect(sum.calls).toBe(1);
  });

  it('excludes calls before the month start', async () => {
    const { recordCall, getMonthlySpend } = await import('../src/ledger');
    await recordCall({
      ts: '2026-03-31T23:59:00Z',
      feature: 'system.ping',
      provider: 'openrouter',
      model: 'm',
      promptTok: 0,
      cachedTok: 0,
      completionTok: 0,
      usdEstimated: 0.5,
    });
    const sum = await getMonthlySpend({ monthStartIso: '2026-04-01T00:00:00Z' });
    expect(sum.usd).toBe(0);
  });
});
