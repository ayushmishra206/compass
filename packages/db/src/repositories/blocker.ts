import type { Db } from '../opfs';

export interface StoredBlockRule {
  id: string;
  pattern: string;
  mode: 'hard' | 'soft';
  source: 'user' | 'adaptive';
  createdAt: string;
  enabled: boolean;
  focusOnly: boolean;
  strikes: number;
}

export interface BlockerRepo {
  add(input: {
    id: string;
    pattern: string;
    mode: 'hard' | 'soft';
    source?: 'user' | 'adaptive';
    focusOnly?: boolean;
    createdAt: string;
  }): Promise<void>;
  list(): Promise<StoredBlockRule[]>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  remove(id: string): Promise<void>;
  /** Records a hit. Stores hostname only — never path, never query. */
  recordEvent(input: {
    id: string;
    ruleId: string;
    hostname: string;
    outcome: 'blocked' | 'bypassed' | 'dismissed';
    occurredAt: string;
  }): Promise<void>;
  countEvents(ruleId: string): Promise<number>;
}

export function createBlockerRepo(db: Db): BlockerRepo {
  return {
    async add(input) {
      db.exec({
        sql: `INSERT INTO block_rules (id, pattern, mode, source, created_at, focus_only)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(pattern) DO UPDATE SET
                mode       = excluded.mode,
                focus_only = excluded.focus_only,
                enabled    = 1`,
        bind: [
          input.id,
          input.pattern,
          input.mode,
          input.source ?? 'user',
          input.createdAt,
          input.focusOnly === false ? 0 : 1,
        ],
      });
    },

    async list() {
      const rows = db.exec({
        sql: `SELECT id, pattern, mode, source, created_at, enabled, focus_only, strikes
              FROM block_rules ORDER BY created_at ASC`,
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows.map((r) => ({
        id: r[0] as string,
        pattern: r[1] as string,
        mode: r[2] as 'hard' | 'soft',
        source: r[3] as 'user' | 'adaptive',
        createdAt: r[4] as string,
        enabled: r[5] === 1,
        focusOnly: r[6] === 1,
        strikes: (r[7] as number) ?? 0,
      }));
    },

    async setEnabled(id, enabled) {
      db.exec({
        sql: 'UPDATE block_rules SET enabled = ? WHERE id = ?',
        bind: [enabled ? 1 : 0, id],
      });
    },

    async remove(id) {
      db.exec({ sql: 'DELETE FROM block_events WHERE rule_id = ?', bind: [id] });
      db.exec({ sql: 'DELETE FROM block_rules WHERE id = ?', bind: [id] });
    },

    async recordEvent(input) {
      db.exec({
        sql: `INSERT INTO block_events (id, rule_id, occurred_at, hostname, outcome)
              VALUES (?, ?, ?, ?, ?)`,
        bind: [input.id, input.ruleId, input.occurredAt, input.hostname, input.outcome],
      });
      // A bypass is the interesting signal — it is the moment the user talked
      // themselves out of their own rule.
      if (input.outcome === 'bypassed') {
        db.exec({
          sql: 'UPDATE block_rules SET strikes = strikes + 1 WHERE id = ?',
          bind: [input.ruleId],
        });
      }
    },

    async countEvents(ruleId) {
      const rows = db.exec({
        sql: 'SELECT COUNT(*) FROM block_events WHERE rule_id = ?',
        bind: [ruleId],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return (rows[0]?.[0] as number) ?? 0;
    },
  };
}
