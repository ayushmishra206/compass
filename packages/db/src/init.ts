import { openOpfsDatabase, type Db } from './opfs';
import { runMigrations } from './migration-runner';

let dbPromise: Promise<Db> | null = null;

export function startDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = openOpfsDatabase().then(async (db) => {
      await runMigrations(db);
      return db;
    });
    // Mark the rejection as handled at the source so a failure does not
    // surface as "Uncaught (in promise)" in chrome://extensions. Subsequent
    // awaiters of dbPromise still receive the rejection and can handle or
    // propagate it.
    dbPromise.catch(() => {
      /* swallow at source; consumers reject independently */
    });
  }
  return dbPromise;
}

export async function getDb(): Promise<Db> {
  if (!dbPromise) {
    throw new Error('startDb() must be called during heavy-doc mount');
  }
  return dbPromise;
}

export function __resetDbForTests(): void {
  dbPromise = null;
}
