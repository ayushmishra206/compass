/// <reference lib="webworker" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient module decl for the `?url` suffix cannot be imported
/// <reference path="../wasm-url.d.ts" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

/**
 * SQLite host worker.
 *
 * Both OPFS VFSs require a Worker, for different reasons:
 *
 * - The default OPFS VFS proxies synchronous I/O through `Atomics.wait`, which
 *   needs SharedArrayBuffer and therefore COOP/COEP headers an extension page
 *   cannot serve.
 * - The SAHPool VFS needs no SharedArrayBuffer, but calls
 *   `FileSystemFileHandle.createSyncAccessHandle()`, which the spec exposes
 *   only inside a dedicated Worker.
 *
 * Running here satisfies the second. SAHPool is the one that can work at all
 * in an extension, so that is the one installed.
 */

type ExecRequest = {
  id: number;
  kind: 'exec';
  sql: string;
  bind?: unknown[] | Record<string, unknown>;
  returnValue?: 'resultRows' | 'this';
};
type InitRequest = { id: number; kind: 'init'; wasmUrl: string; filename: string };
type Request = ExecRequest | InitRequest;

type SqliteInitConfig = { locateFile?: (path: string) => string };
const initWithConfig = sqlite3InitModule as unknown as (
  cfg?: SqliteInitConfig,
) => ReturnType<typeof sqlite3InitModule>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;

async function init(req: InitRequest): Promise<void> {
  const sqlite3 = await initWithConfig({
    locateFile: (path) => (path === 'sqlite3.wasm' ? req.wasmUrl : path),
  });

  if (typeof sqlite3.installOpfsSAHPoolVfs !== 'function') {
    throw new Error('sqlite-wasm build does not expose installOpfsSAHPoolVfs');
  }

  const pool = await sqlite3.installOpfsSAHPoolVfs({
    // Capacity must exceed the database count with headroom for journal and
    // temp files; the docs advise 2-3x.
    initialCapacity: 6,
    directory: '/compass-sahpool',
  });

  db = new pool.OpfsSAHPoolDb(req.filename);
}

self.onmessage = async (ev: MessageEvent<Request>) => {
  const req = ev.data;
  try {
    if (req.kind === 'init') {
      await init(req);
      self.postMessage({ id: req.id, ok: true, result: null });
      return;
    }

    if (!db) throw new Error('sqlite worker received a query before init completed');

    // `bind` and `resultRows` cross the structured-clone boundary as plain
    // arrays, which is all the repositories use.
    const result = db.exec({
      sql: req.sql,
      bind: req.bind,
      returnValue: req.returnValue ?? 'this',
      rowMode: 'array',
    });

    self.postMessage({
      id: req.id,
      ok: true,
      result: req.returnValue === 'resultRows' ? result : null,
    });
  } catch (e) {
    self.postMessage({
      id: req.id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
};
