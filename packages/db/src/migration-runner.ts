import type { Db } from './opfs';

interface Migration {
  version: number;
  name: string;
  sql: string;
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
  embedding    BLOB NOT NULL,
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

CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, body, note_id) VALUES (new.rowid, new.title, new.body, new.id);
END;
CREATE TRIGGER notes_fts_au AFTER UPDATE ON notes BEGIN
  UPDATE notes_fts SET title=new.title, body=new.body, note_id=new.id WHERE rowid=old.rowid;
END;
CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes BEGIN
  DELETE FROM notes_fts WHERE rowid=old.rowid;
END;

UPDATE meta SET value = '3' WHERE key = 'schema_version';
`;

const MIGRATIONS: Migration[] = [
  { version: 1, name: 'foundation', sql: MIGRATION_0001_FOUNDATION },
  { version: 2, name: 'briefings-pomodoros', sql: MIGRATION_0002_BRIEFINGS_POMODOROS },
  { version: 3, name: 'notes', sql: MIGRATION_0003_NOTES },
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
  }
}
