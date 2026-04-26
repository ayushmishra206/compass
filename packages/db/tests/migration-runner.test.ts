import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations, getSchemaVersion } from '../src/migration-runner';
import type { Db } from '../src/opfs';

let db: Db | null = null;

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
});

describe('migration-runner', () => {
  it('applies migration 0001 on a fresh DB', async () => {
    await runMigrations(db!);
    expect(getSchemaVersion(db!)).toBe(1);
    const tables = db!.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      returnValue: 'resultRows',
    });
    expect(tables.flat()).toContain('llm_cost_ledger');
    expect(tables.flat()).toContain('meta');
  });

  it('is idempotent — running twice does not re-apply', async () => {
    await runMigrations(db!);
    await runMigrations(db!);
    expect(getSchemaVersion(db!)).toBe(1);
  });
});
