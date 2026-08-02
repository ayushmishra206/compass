// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient module decl for the `?url` suffix cannot be imported
/// <reference path="./wasm-url.d.ts" />
import SqliteWorker from './worker/sqlite.worker?worker';
import { createWorkerDb, type AsyncDb } from './worker/client';

/**
 * The database handle. Async because SQLite runs in a Worker — see
 * `worker/sqlite.worker.ts` for why a Worker is not optional here.
 */
export type Db = AsyncDb;

let dbInstance: Db | null = null;

const DB_FILENAME = 'compass.sqlite3';

export async function openOpfsDatabase(): Promise<Db> {
  if (dbInstance) return dbInstance;

  // `?worker` rather than `new URL(..., import.meta.url)`. The latter is only
  // rewritten into a bundled worker when Vite sees it in an app entry; from a
  // workspace package it survives the build as a literal ".ts" path and 404s
  // at runtime. Verified against the emitted chunk, not assumed.
  const worker = new SqliteWorker();

  const db = createWorkerDb(worker);
  await db.init(await resolveWasmUrl(), DB_FILENAME);

  dbInstance = db;
  return db;
}

async function resolveWasmUrl(): Promise<string> {
  // Vite emits the .wasm as a fingerprinted asset and rewrites this URL.
  const mod = await import('@sqlite.org/sqlite-wasm/sqlite3.wasm?url');
  return mod.default;
}

export function __resetForTests(): void {
  dbInstance = null;
}
