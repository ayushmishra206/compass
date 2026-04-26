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
