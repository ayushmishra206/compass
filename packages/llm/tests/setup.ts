import { vi } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '@compass/db';
import type { Db } from '@compass/db';

let testDb: Db | null = null;

export async function setupInMemoryDb(): Promise<void> {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testDb = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(testDb!);
  vi.mock('@compass/db', () => ({
    getDb: vi.fn(async () => testDb),
    startDb: vi.fn(async () => testDb),
  }));
}

export function resetTestDb(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}
