import type { Db } from './opfs';

interface Migration {
  version: number;
  name: string;
  sql: string;
  /** Optional DDL that requires a native extension (e.g. sqlite-vec).
   *  Applied after the main sql, outside the transaction, with a best-effort
   *  try/catch so tests running without the extension can still pass. */
  extSql?: string;
}

const MIGRATION_0001_FOUNDATION = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO meta(key, value) VALUES ('schema_version', '1');

CREATE TABLE llm_cost_ledger (
  id              TEXT PRIMARY KEY,
  ts              TEXT NOT NULL,
  feature         TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  prompt_tok      INTEGER NOT NULL,
  cached_tok      INTEGER NOT NULL,
  completion_tok  INTEGER NOT NULL,
  usd_estimated   REAL NOT NULL
);
CREATE INDEX idx_ledger_ts ON llm_cost_ledger(ts);
`;

const MIGRATION_0002_BRIEFINGS_POMODOROS = `
CREATE TABLE briefings (
  date_local    TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('morning', 'eod')),
  generated_at  TEXT NOT NULL,
  output_json   TEXT NOT NULL,
  opened_at     TEXT,
  user_rating   INTEGER CHECK (user_rating IN (-1, 1)),
  provider_used TEXT NOT NULL,
  cost_usd      REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (date_local, kind)
);
CREATE INDEX briefings_kind_date ON briefings(kind, date_local DESC);

CREATE TABLE pomodoros (
  id              TEXT PRIMARY KEY,
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  duration_min    INTEGER NOT NULL,
  completed       INTEGER NOT NULL DEFAULT 0,
  interrupt_count INTEGER NOT NULL DEFAULT 0,
  theme           TEXT
);
CREATE INDEX pomodoros_started ON pomodoros(started_at DESC);

UPDATE meta SET value = '2' WHERE key = 'schema_version';
`;

const MIGRATION_0003_NOTES = `
CREATE TABLE notes (
  id              TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  tags_json       TEXT NOT NULL DEFAULT '[]',
  manual_links    TEXT NOT NULL DEFAULT '[]',
  embedding_model TEXT NOT NULL,
  autolink_enabled INTEGER NOT NULL DEFAULT 1,
  reembed_pending INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX notes_updated ON notes(updated_at DESC);

CREATE TABLE note_chunks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id      TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  text         TEXT NOT NULL,
  UNIQUE(note_id, chunk_index)
);
CREATE INDEX note_chunks_note ON note_chunks(note_id);

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, body, note_id UNINDEXED, tokenize='porter unicode61'
);

CREATE TABLE auto_links (
  src_note_id    TEXT NOT NULL,
  target_note_id TEXT NOT NULL,
  similarity     REAL NOT NULL,
  detected_at    TEXT NOT NULL,
  rationale      TEXT,
  rationale_at   TEXT,
  user_feedback  TEXT,
  dismissed      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (src_note_id, target_note_id),
  CHECK (src_note_id < target_note_id)
);
CREATE INDEX auto_links_src ON auto_links(src_note_id);
CREATE INDEX auto_links_target ON auto_links(target_note_id);

UPDATE meta SET value = '3' WHERE key = 'schema_version';
`;

// notes_vec requires the sqlite-vec native extension (vec0 module).
// In production openOpfsDatabase() calls loadVec() before runMigrations(),
// so this always succeeds. In Node-based vitest the extension is unavailable
// (sqlite-wasm does not expose loadExtension in its Node build), so this DDL
// is applied outside the transaction with a best-effort try/catch.
const MIGRATION_0003_NOTES_VEC = `
CREATE VIRTUAL TABLE notes_vec USING vec0(
  embedding float[384]
);
`;

const MIGRATIONS: Migration[] = [
  { version: 1, name: 'foundation', sql: MIGRATION_0001_FOUNDATION },
  { version: 2, name: 'briefings-pomodoros', sql: MIGRATION_0002_BRIEFINGS_POMODOROS },
  { version: 3, name: 'notes', sql: MIGRATION_0003_NOTES, extSql: MIGRATION_0003_NOTES_VEC },
];

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
    // Apply extension-dependent DDL outside the transaction (best-effort).
    // In production this succeeds because the native extension is pre-loaded.
    if (m.extSql) {
      try {
        db.exec(m.extSql);
      } catch {
        // Extension not available (e.g. Node/vitest environment). Skipping.
      }
    }
  }
}
