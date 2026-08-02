// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- ambient module decl for the `?url` suffix cannot be imported
/// <reference path="../wasm-url.d.ts" />

/**
 * Async database handle backed by the SQLite host worker.
 *
 * The repositories previously called a synchronous `db.exec(...)`. Moving
 * SQLite into a worker makes every query a message round-trip, so `exec` is
 * now async and every call site awaits it. That is the cost of persistence
 * working at all in an extension — see sqlite.worker.ts.
 */

/** Positional (`?`) or named (`$foo`) binds — sqlite accepts both. */
export type BindValues = unknown[] | Record<string, unknown>;

export interface ExecArgs {
  sql: string;
  bind?: BindValues;
  returnValue?: 'resultRows' | 'this';
}

export interface AsyncDb {
  exec(argsOrSql: ExecArgs | string): Promise<unknown>;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export function createWorkerDb(
  worker: Worker,
): AsyncDb & { init(wasmUrl: string, filename: string): Promise<void> } {
  const pending = new Map<number, Pending>();
  let nextId = 1;

  worker.onmessage = (
    ev: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>,
  ) => {
    const entry = pending.get(ev.data.id);
    if (!entry) return;
    pending.delete(ev.data.id);
    if (ev.data.ok) entry.resolve(ev.data.result);
    else entry.reject(new Error(ev.data.error ?? 'sqlite worker error'));
  };

  worker.onerror = (ev) => {
    // A worker-level failure strands every in-flight query; fail them all
    // rather than leaving callers hanging forever.
    const err = new Error(`sqlite worker failed: ${ev.message}`);
    for (const [, entry] of pending) entry.reject(err);
    pending.clear();
  };

  function send(message: Record<string, unknown>): Promise<unknown> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...message, id });
    });
  }

  return {
    async init(wasmUrl: string, filename: string) {
      await send({ kind: 'init', wasmUrl, filename });
    },
    async exec(argsOrSql: ExecArgs | string) {
      const args: ExecArgs = typeof argsOrSql === 'string' ? { sql: argsOrSql } : argsOrSql;
      return send({
        kind: 'exec',
        sql: args.sql,
        bind: args.bind,
        returnValue: args.returnValue,
      });
    },
  };
}

/**
 * Wraps a synchronous sqlite3 Database in the async interface.
 *
 * Used by tests, which open an in-memory DB directly and have no worker. Keeps
 * the repositories on one interface rather than branching on environment.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapSyncDb(db: any): AsyncDb {
  return {
    async exec(argsOrSql: ExecArgs | string) {
      if (typeof argsOrSql === 'string') return db.exec(argsOrSql);
      return db.exec({
        sql: argsOrSql.sql,
        bind: argsOrSql.bind,
        returnValue: argsOrSql.returnValue ?? 'this',
        rowMode: 'array',
      });
    },
  };
}
