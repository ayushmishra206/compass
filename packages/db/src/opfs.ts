import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';

export type Db = Database;

let dbInstance: Db | null = null;

export async function openOpfsDatabase(): Promise<Db> {
  if (dbInstance) return dbInstance;
  const sqlite3 = await sqlite3InitModule();
  if (!('opfs' in sqlite3)) {
    throw new Error('sqlite-wasm OPFS not available; check COOP/COEP and SAB support');
  }
  const db: Db = new sqlite3.oo1.OpfsDb('compass.sqlite3');
  dbInstance = db;
  return db;
}

export function __resetForTests(): void {
  dbInstance = null;
}
