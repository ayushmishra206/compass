// Ambient declaration for the `?url` Vite suffix lives in wasm-url.d.ts —
// must be a script-mode .d.ts (no imports/exports) for the wildcard form to
// be valid. Triple-slash ref forces every consumer's typechecker to load it.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient module decl can't be inlined inside a module file
/// <reference path="./wasm-url.d.ts" />
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

const DB_FILENAME = 'compass.sqlite3';

/**
 * Opens the OPFS-backed database.
 *
 * Uses the **OPFS SyncAccessHandle Pool** VFS (`opfs-sahpool`), not the
 * default OPFS VFS.
 *
 * The default `OpfsDb` needs a SharedArrayBuffer to proxy synchronous file
 * access from the main thread to its worker, and SharedArrayBuffer requires
 * cross-origin isolation — COOP and COEP response headers. An MV3 offscreen
 * document is loaded from a chrome-extension:// URL and cannot carry those
 * headers, so `'opfs' in sqlite3` is never true there and every DB-backed
 * route fails. That was the observed failure: "OPFS not available; check
 * COOP/COEP and SAB support".
 *
 * The SAHPool VFS pre-opens a pool of sync access handles and does its own
 * file mapping, so it needs no SharedArrayBuffer and no special headers. It is
 * the supported approach for exactly this environment.
 *
 * Trade-off accepted: only one connection may use the pool directory at a
 * time. Compass opens the DB solely from the offscreen document, so there is
 * no second connection to conflict with.
 */
export async function openOpfsDatabase(): Promise<Db> {
  if (dbInstance) return dbInstance;

  const wasmUrl = await resolveWasmUrl();
  const sqlite3 = await initWithConfig({
    locateFile: (path) => (path === 'sqlite3.wasm' ? wasmUrl : path),
  });

  if (typeof sqlite3.installOpfsSAHPoolVfs !== 'function') {
    throw new Error(
      'sqlite-wasm build does not expose installOpfsSAHPoolVfs; OPFS persistence unavailable',
    );
  }

  const pool = await sqlite3.installOpfsSAHPoolVfs({
    // Capacity must exceed the number of database files, with headroom for
    // journal and temp files — the docs advise at least 2-3x.
    initialCapacity: 6,
    directory: '/compass-sahpool',
  });

  const db: Db = new pool.OpfsSAHPoolDb(DB_FILENAME);
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
