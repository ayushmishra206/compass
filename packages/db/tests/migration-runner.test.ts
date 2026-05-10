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
  it('applies all migrations on a fresh DB', async () => {
    await runMigrations(db!);
    expect(getSchemaVersion(db!)).toBe(3);
    const tables = db!.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      returnValue: 'resultRows',
    });
    expect(tables.flat()).toContain('llm_cost_ledger');
    expect(tables.flat()).toContain('meta');
    expect(tables.flat()).toContain('briefings');
    expect(tables.flat()).toContain('pomodoros');
  });

  it('is idempotent — running twice does not re-apply', async () => {
    await runMigrations(db!);
    await runMigrations(db!);
    expect(getSchemaVersion(db!)).toBe(3);
  });
});

describe('migration v3 — semantic notes', () => {
  // Phase 2 semantic-notes uses BLOB embeddings on note_chunks + JS cosine
  // for similarity (no sqlite-vec virtual table). Rationale: sqlite-wasm
  // does not expose loadExtension() in Node or browser builds, so vec0
  // cannot be registered cross-environment. JS cosine is acceptable at the
  // 10k-note target size; gate is tracked in tests/perf/hybrid-search.bench.ts.
  it('creates notes (with embedding BLOB on chunks), notes_fts, auto_links and bumps schema_version to 3', async () => {
    const sqlite3 = await sqlite3InitModule();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = new sqlite3.oo1.DB(':memory:', 'c') as any;
    await runMigrations(db);
    expect(getSchemaVersion(db)).toBe(3);

    const tables = db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type IN ('table','view')",
      returnValue: 'resultRows',
    }) as Array<[string]>;
    const names = (tables as Array<[string]>).map((r) => r[0]);
    for (const t of ['notes', 'note_chunks', 'notes_fts', 'auto_links']) {
      expect(names).toContain(t);
    }

    // note_chunks must carry an embedding BLOB column (raw float32 bytes).
    const cols = db.exec({
      sql: 'PRAGMA table_info(note_chunks)',
      returnValue: 'resultRows',
    }) as Array<[number, string, string, number, unknown, number]>;
    const colNames = cols.map((c) => c[1]);
    expect(colNames).toContain('embedding');
  });
});
