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

const MIGRATION_0004_CALENDAR = `
CREATE TABLE calendar_events (
  id             TEXT PRIMARY KEY,
  calendar_id    TEXT NOT NULL,
  start_at       TEXT NOT NULL,
  end_at         TEXT NOT NULL,
  all_day        INTEGER NOT NULL DEFAULT 0,
  summary        TEXT NOT NULL DEFAULT '',
  location       TEXT,
  has_conference INTEGER NOT NULL DEFAULT 0,
  is_focus_block INTEGER NOT NULL DEFAULT 0,
  self_response  TEXT,
  status         TEXT NOT NULL DEFAULT 'confirmed',
  updated_at     TEXT NOT NULL,
  synced_at      TEXT NOT NULL
);
CREATE INDEX calendar_events_start ON calendar_events(start_at);

CREATE TABLE calendar_attendees (
  event_id  TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  email     TEXT NOT NULL,
  is_self   INTEGER NOT NULL DEFAULT 0,
  response  TEXT,
  PRIMARY KEY (event_id, email)
);
CREATE INDEX idx_attendees_email ON calendar_attendees(email);

-- One row per calendar, holding Google's opaque incremental syncToken.
CREATE TABLE calendar_sync_state (
  calendar_id  TEXT PRIMARY KEY,
  sync_token   TEXT,
  last_sync_at TEXT
);

UPDATE meta SET value = '4' WHERE key = 'schema_version';
`;

const MIGRATION_0005_GOALS = `
CREATE TABLE goals (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL,
  horizon      TEXT NOT NULL CHECK (horizon IN ('quarter', 'year', 'custom')),
  start_date   TEXT NOT NULL,
  end_date     TEXT NOT NULL,
  title        TEXT NOT NULL,
  why          TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'paused', 'achieved', 'abandoned')),
  -- Decomposition provenance. Null until the user asks for one.
  decomposed_at TEXT,
  model_id      TEXT,
  daily_templates TEXT NOT NULL DEFAULT '[]',
  risks           TEXT NOT NULL DEFAULT '[]',
  first_week_focus TEXT
);
CREATE INDEX goals_status ON goals(status, end_date);

CREATE TABLE milestones (
  id                 TEXT PRIMARY KEY,
  goal_id            TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  week_index         INTEGER NOT NULL,
  title              TEXT NOT NULL,
  target_date        TEXT,
  definition_of_done TEXT NOT NULL DEFAULT '',
  done               INTEGER NOT NULL DEFAULT 0,
  completed_at       TEXT
);
CREATE INDEX milestones_goal ON milestones(goal_id, week_index);

UPDATE meta SET value = '5' WHERE key = 'schema_version';
`;

const MIGRATION_0006_FOCUS = `
-- Which soundscape was playing, so soundscapeCorrelations has something to
-- correlate. Additive per the migration policy; existing rows stay NULL.
ALTER TABLE pomodoros ADD COLUMN soundscape_id TEXT;

CREATE TABLE block_rules (
  id          TEXT PRIMARY KEY,
  pattern     TEXT NOT NULL,
  mode        TEXT NOT NULL CHECK (mode IN ('hard', 'soft')),
  source      TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'adaptive')),
  created_at  TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  -- Only blocks while a pomodoro is running, rather than around the clock.
  focus_only  INTEGER NOT NULL DEFAULT 1,
  strikes     INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX block_rules_pattern ON block_rules(pattern);

CREATE TABLE block_events (
  id          TEXT PRIMARY KEY,
  rule_id     TEXT NOT NULL REFERENCES block_rules(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  -- Hostname only. Never the path and never the query — see AGENTS.md.
  hostname    TEXT NOT NULL,
  outcome     TEXT NOT NULL
                CHECK (outcome IN ('blocked', 'bypassed', 'dismissed'))
);
CREATE INDEX block_events_rule ON block_events(rule_id, occurred_at DESC);

UPDATE meta SET value = '6' WHERE key = 'schema_version';
`;

const MIGRATIONS: Migration[] = [
  { version: 1, name: 'foundation', sql: MIGRATION_0001_FOUNDATION },
  { version: 2, name: 'briefings-pomodoros', sql: MIGRATION_0002_BRIEFINGS_POMODOROS },
  { version: 3, name: 'notes', sql: MIGRATION_0003_NOTES },
  { version: 4, name: 'calendar', sql: MIGRATION_0004_CALENDAR },
  { version: 5, name: 'goals', sql: MIGRATION_0005_GOALS },
  { version: 6, name: 'focus', sql: MIGRATION_0006_FOCUS },
];

/** Version a fully-migrated DB lands on. Derived, so adding a migration updates it. */
export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

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
