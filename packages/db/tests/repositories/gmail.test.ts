import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import { createGmailRepo, MAX_SNIPPET_CHARS, type GmailRepo } from '../../src/repositories/gmail';
import type { Db } from '../../src/opfs';

let db: Db;
let repo: GmailRepo;

const msg = (over: Record<string, unknown> = {}) => ({
  messageId: 'm1',
  threadId: 't1',
  fromEmail: 'sender@example.com',
  fromName: 'Sender',
  subject: 'Q3 deck',
  snippet: 'Can you review it before Thursday?',
  receivedAt: '2026-08-02T09:00:00.000Z',
  ...over,
});

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(db);
  repo = createGmailRepo(db);
});

describe('upsert / list', () => {
  it('round-trips a message', async () => {
    await repo.upsert([msg()]);
    const [m] = await repo.list();
    expect(m?.subject).toBe('Q3 deck');
    expect(m?.fromEmail).toBe('sender@example.com');
  });

  it('starts unprocessed with no priority or actions', async () => {
    await repo.upsert([msg()]);
    const [m] = await repo.list();
    expect(m?.priority).toBeNull();
    expect(m?.actions).toEqual([]);
    expect(m?.lastProcessedAt).toBeNull();
  });

  it('is idempotent on re-sync', async () => {
    await repo.upsert([msg()]);
    await repo.upsert([msg({ subject: 'Q3 deck (updated)' })]);
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.subject).toBe('Q3 deck (updated)');
  });

  it('orders newest first', async () => {
    await repo.upsert([
      msg({ messageId: 'old', receivedAt: '2026-08-01T09:00:00.000Z' }),
      msg({ messageId: 'new', receivedAt: '2026-08-02T09:00:00.000Z' }),
    ]);
    expect((await repo.list()).map((m) => m.messageId)).toEqual(['new', 'old']);
  });

  it('truncates the snippet at write time, not just on read', async () => {
    await repo.upsert([msg({ snippet: 'x'.repeat(2000) })]);
    const raw = db.exec({
      sql: 'SELECT snippet FROM gmail_messages_index',
      returnValue: 'resultRows',
    }) as Array<Array<unknown>>;
    expect(String(raw[0]?.[0]).length).toBe(MAX_SNIPPET_CHARS);
  });

  it('never stores a full body — only what the caller passed as snippet', async () => {
    await repo.upsert([msg({ snippet: 'short' })]);
    const cols = db.exec({
      sql: 'PRAGMA table_info(gmail_messages_index)',
      returnValue: 'resultRows',
    }) as Array<Array<unknown>>;
    const names = cols.map((c) => c[1]);
    expect(names).not.toContain('body');
    expect(names).not.toContain('body_html');
  });

  it('handles an empty batch', async () => {
    await expect(repo.upsert([])).resolves.toBeUndefined();
  });
});

describe('saveExtraction', () => {
  beforeEach(async () => {
    await repo.upsert([msg()]);
  });

  it('stores priority and actions', async () => {
    await repo.saveExtraction('m1', {
      priority: 'p1',
      actions: [{ title: 'Review deck', owner: 'me', commitmentType: 'task', confidence: 0.9 }],
      injectionFlags: [],
      processedAt: '2026-08-02T10:00:00.000Z',
    });
    const m = await repo.get('m1');
    expect(m?.priority).toBe('p1');
    expect(m?.actions[0]?.title).toBe('Review deck');
    expect(m?.lastProcessedAt).toBe('2026-08-02T10:00:00.000Z');
  });

  it('stores injection flags as ids, never as content', async () => {
    await repo.saveExtraction('m1', {
      priority: 'p3',
      actions: [],
      injectionFlags: ['ignore_previous', 'exfiltrate'],
      processedAt: '2026-08-02T10:00:00.000Z',
    });
    const m = await repo.get('m1');
    expect(m?.injectionFlags).toEqual(['ignore_previous', 'exfiltrate']);
    for (const f of m!.injectionFlags) expect(f).toMatch(/^[a-z_]+$/);
  });

  it('moves the message out of the unprocessed queue', async () => {
    expect(await repo.unprocessed(10)).toHaveLength(1);
    await repo.saveExtraction('m1', {
      priority: 'p2',
      actions: [],
      injectionFlags: [],
      processedAt: '2026-08-02T10:00:00.000Z',
    });
    expect(await repo.unprocessed(10)).toHaveLength(0);
  });
});

describe('unprocessed', () => {
  it('returns only messages never processed', async () => {
    await repo.upsert([msg({ messageId: 'a' }), msg({ messageId: 'b' })]);
    await repo.saveExtraction('a', {
      priority: 'p2',
      actions: [],
      injectionFlags: [],
      processedAt: '2026-08-02T10:00:00.000Z',
    });
    expect((await repo.unprocessed(10)).map((m) => m.messageId)).toEqual(['b']);
  });

  it('respects the limit', async () => {
    await repo.upsert([msg({ messageId: 'a' }), msg({ messageId: 'b' }), msg({ messageId: 'c' })]);
    expect(await repo.unprocessed(2)).toHaveLength(2);
  });
});

describe('wipe', () => {
  it('removes everything — this backs the settings kill switch', async () => {
    await repo.upsert([msg({ messageId: 'a' }), msg({ messageId: 'b' })]);
    await repo.wipe();
    expect(await repo.list()).toEqual([]);
  });
});

describe('pruneOlderThan', () => {
  it('drops messages past the retention window', async () => {
    await repo.upsert([
      msg({ messageId: 'old', receivedAt: '2026-06-01T00:00:00.000Z' }),
      msg({ messageId: 'recent', receivedAt: '2026-08-01T00:00:00.000Z' }),
    ]);
    const removed = await repo.pruneOlderThan('2026-07-01T00:00:00.000Z');
    expect(removed).toBe(1);
    expect((await repo.list()).map((m) => m.messageId)).toEqual(['recent']);
  });

  it('is a no-op when nothing is old enough', async () => {
    await repo.upsert([msg()]);
    expect(await repo.pruneOlderThan('2020-01-01T00:00:00.000Z')).toBe(0);
  });
});
