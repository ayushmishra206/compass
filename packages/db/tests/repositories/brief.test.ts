import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import type { Db } from '../../src/opfs';
import { createBriefRepo, type BriefRepo, type StoredBriefing } from '../../src/repositories/brief';

let db: Db;
let repo: BriefRepo;

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(db);
  repo = createBriefRepo(db);
});

const sample: StoredBriefing = {
  dateLocal: '2026-05-10',
  kind: 'morning',
  generatedAt: '2026-05-10T08:00:00Z',
  output: { tldr: 'test' },
  openedAt: null,
  userRating: null,
  providerUsed: 'openrouter',
  costUsd: 0.0003,
};

describe('BriefRepo', () => {
  it('returns null when no row exists', async () => {
    expect(await repo.getByDate('2026-05-10', 'morning')).toBeNull();
  });

  it('upserts and returns the row', async () => {
    await repo.upsert(sample);
    const got = await repo.getByDate('2026-05-10', 'morning');
    expect(got?.dateLocal).toBe('2026-05-10');
    expect(got?.kind).toBe('morning');
    expect(got?.providerUsed).toBe('openrouter');
    expect(got?.costUsd).toBeCloseTo(0.0003);
    expect(got?.output).toEqual({ tldr: 'test' });
  });

  it('upsert overwrites when same (date_local, kind)', async () => {
    await repo.upsert(sample);
    await repo.upsert({ ...sample, costUsd: 0.0007, providerUsed: 'openai' });
    const got = await repo.getByDate('2026-05-10', 'morning');
    expect(got?.providerUsed).toBe('openai');
    expect(got?.costUsd).toBeCloseTo(0.0007);
  });

  it('records open timestamp', async () => {
    await repo.upsert(sample);
    await repo.recordOpen('2026-05-10', 'morning', '2026-05-10T08:30:00Z');
    expect((await repo.getByDate('2026-05-10', 'morning'))?.openedAt).toBe('2026-05-10T08:30:00Z');
  });

  it('records rating', async () => {
    await repo.upsert(sample);
    await repo.recordRating('2026-05-10', 'morning', 1);
    expect((await repo.getByDate('2026-05-10', 'morning'))?.userRating).toBe(1);
  });

  it('recentOpenStatus returns rows for the given date range', async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const twoDaysAgoIso = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    await repo.upsert({ ...sample, dateLocal: todayIso, openedAt: '2026-05-10T08:30:00Z' });
    await repo.upsert({ ...sample, dateLocal: yesterdayIso, openedAt: '2026-05-09T08:30:00Z' });
    await repo.upsert({ ...sample, dateLocal: twoDaysAgoIso, openedAt: null });

    const status = await repo.recentOpenStatus(7);
    expect(status.length).toBeGreaterThanOrEqual(3);

    const todayEntry = status.find((s) => s.dateLocal === todayIso);
    const twoDaysAgoEntry = status.find((s) => s.dateLocal === twoDaysAgoIso);
    expect(todayEntry?.opened).toBe(true);
    expect(twoDaysAgoEntry?.opened).toBe(false);

    // Results should be newest first
    for (let i = 1; i < status.length; i++) {
      expect(status[i - 1].dateLocal >= status[i].dateLocal).toBe(true);
    }
  });
});
