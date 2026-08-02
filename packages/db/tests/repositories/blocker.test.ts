import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import { wrapSyncDb } from '../../src/worker/client';
import { createBlockerRepo, type BlockerRepo } from '../../src/repositories/blocker';
import type { Db } from '../../src/opfs';

let db: Db;
let repo: BlockerRepo;
const NOW = '2026-08-02T10:00:00.000Z';

const rule = (over: Partial<Parameters<BlockerRepo['add']>[0]> = {}) => ({
  id: 'r1',
  pattern: 'reddit.com',
  mode: 'soft' as const,
  createdAt: NOW,
  ...over,
});

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();

  db = wrapSyncDb(new sqlite3.oo1.DB(':memory:'));
  await runMigrations(db);
  repo = createBlockerRepo(db);
});

describe('add / list', () => {
  it('round-trips a rule', async () => {
    await repo.add(rule());
    const [r] = await repo.list();
    expect(r?.pattern).toBe('reddit.com');
    expect(r?.mode).toBe('soft');
    expect(r?.enabled).toBe(true);
  });

  it('defaults to user-created and focus-only', async () => {
    await repo.add(rule());
    const [r] = await repo.list();
    expect(r?.source).toBe('user');
    expect(r?.focusOnly).toBe(true);
  });

  it('honours an always-on rule', async () => {
    await repo.add(rule({ focusOnly: false }));
    expect((await repo.list())[0]?.focusOnly).toBe(false);
  });

  it('re-adding the same pattern updates rather than duplicating', async () => {
    await repo.add(rule());
    await repo.add(rule({ id: 'r2', mode: 'hard' }));
    const rules = await repo.list();
    expect(rules).toHaveLength(1);
    expect(rules[0]?.mode).toBe('hard');
  });

  it('re-adding re-enables a disabled rule', async () => {
    await repo.add(rule());
    await repo.setEnabled('r1', false);
    await repo.add(rule());
    expect((await repo.list())[0]?.enabled).toBe(true);
  });

  it('returns an empty list when nothing is configured', async () => {
    expect(await repo.list()).toEqual([]);
  });
});

describe('setEnabled / remove', () => {
  beforeEach(async () => {
    await repo.add(rule());
  });

  it('disables without deleting', async () => {
    await repo.setEnabled('r1', false);
    const rules = await repo.list();
    expect(rules).toHaveLength(1);
    expect(rules[0]?.enabled).toBe(false);
  });

  it('deletes the rule', async () => {
    await repo.remove('r1');
    expect(await repo.list()).toEqual([]);
  });

  it('deletes the rule’s events too', async () => {
    await repo.recordEvent({
      id: 'e1',
      ruleId: 'r1',
      hostname: 'reddit.com',
      outcome: 'blocked',
      occurredAt: NOW,
    });
    await repo.remove('r1');
    const orphans = (await db.exec({
      sql: 'SELECT COUNT(*) FROM block_events',
      returnValue: 'resultRows',
    })) as Array<Array<unknown>>;
    expect(orphans[0]?.[0]).toBe(0);
  });
});

describe('recordEvent', () => {
  beforeEach(async () => {
    await repo.add(rule());
  });

  it('counts events for a rule', async () => {
    await repo.recordEvent({
      id: 'e1',
      ruleId: 'r1',
      hostname: 'reddit.com',
      outcome: 'blocked',
      occurredAt: NOW,
    });
    expect(await repo.countEvents('r1')).toBe(1);
  });

  it('increments strikes only on a bypass', async () => {
    await repo.recordEvent({
      id: 'e1',
      ruleId: 'r1',
      hostname: 'reddit.com',
      outcome: 'blocked',
      occurredAt: NOW,
    });
    expect((await repo.list())[0]?.strikes).toBe(0);

    await repo.recordEvent({
      id: 'e2',
      ruleId: 'r1',
      hostname: 'reddit.com',
      outcome: 'bypassed',
      occurredAt: NOW,
    });
    expect((await repo.list())[0]?.strikes).toBe(1);
  });

  it('does not count a dismissal as a strike', async () => {
    await repo.recordEvent({
      id: 'e1',
      ruleId: 'r1',
      hostname: 'reddit.com',
      outcome: 'dismissed',
      occurredAt: NOW,
    });
    expect((await repo.list())[0]?.strikes).toBe(0);
  });

  it('stores only a hostname, never a full url', async () => {
    await repo.recordEvent({
      id: 'e1',
      ruleId: 'r1',
      hostname: 'reddit.com',
      outcome: 'blocked',
      occurredAt: NOW,
    });
    const rows = (await db.exec({
      sql: 'SELECT hostname FROM block_events',
      returnValue: 'resultRows',
    })) as Array<Array<unknown>>;
    expect(rows[0]?.[0]).toBe('reddit.com');
    expect(String(rows[0]?.[0])).not.toContain('/');
    expect(String(rows[0]?.[0])).not.toContain('?');
  });
});
