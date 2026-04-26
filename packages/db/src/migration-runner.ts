import migration0001 from './migrations/0001-foundation.sql?raw';
import type { Db } from './opfs';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [{ version: 1, name: 'foundation', sql: migration0001 }];

export function getSchemaVersion(db: Db): number {
  try {
    const rows = db.exec({
      sql: "SELECT value FROM meta WHERE key='schema_version'",
      returnValue: 'resultRows',
    }) as Array<[string]>;
    return rows[0] ? parseInt(rows[0][0], 10) : 0;
  } catch {
    // meta table doesn't exist yet
    return 0;
  }
}

export async function runMigrations(db: Db): Promise<void> {
  const current = getSchemaVersion(db);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      // 0001 already inserts schema_version='1'. For 0002+, the migration
      // SQL must update meta.schema_version itself.
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
