import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';

export type Db = Database;

let dbInstance: Db | null = null;

/**
 * sqlite3InitModule's runtime accepts an Emscripten Module-config arg even
 * though the type omits it. locateFile is the documented Emscripten hook for
 * pointing the loader at a Vite-bundled sqlite3.wasm asset — without it the
 * Emscripten loader fetches sqlite3.wasm relative to its own chunk URL, which
 * does not exist in the production build output.
 */
type SqliteInitConfig = {
  locateFile?: (path: string, scriptDir: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
};
const initWithConfig = sqlite3InitModule as unknown as (
  cfg?: SqliteInitConfig,
) => ReturnType<typeof sqlite3InitModule>;

export async function openOpfsDatabase(): Promise<Db> {
  if (dbInstance) return dbInstance;
  const wasmUrl = await resolveWasmUrl();
  const sqlite3 = await initWithConfig({
    locateFile: (path) => (path === 'sqlite3.wasm' ? wasmUrl : path),
  });
  if (!('opfs' in sqlite3)) {
    throw new Error('sqlite-wasm OPFS not available; check COOP/COEP and SAB support');
  }
  const db: Db = new sqlite3.oo1.OpfsDb('compass.sqlite3');
  dbInstance = db;
  return db;
}

async function resolveWasmUrl(): Promise<string> {
  // Vite emits the .wasm as a fingerprinted asset and rewrites this URL.
  // Outside Vite (Node tests), this falls through to the package's resolved path.
  const mod = await import('@sqlite.org/sqlite-wasm/sqlite3.wasm?url');
  return mod.default;
}

export function __resetForTests(): void {
  dbInstance = null;
}
