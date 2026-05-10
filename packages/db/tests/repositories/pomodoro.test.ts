import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import type { Db } from '../../src/opfs';
import { createPomodoroRepo, type PomodoroRepo } from '../../src/repositories/pomodoro';

let db: Db;
let repo: PomodoroRepo;

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(db);
  repo = createPomodoroRepo(db);
});

describe('PomodoroRepo', () => {
  it('start inserts a row', async () => {
    await repo.start({ id: 'p1', durationMin: 25 });
    const summary = await repo.summarize14d(new Date());
    expect(summary.totalFocusMin).toBe(0); // not yet completed
  });

  it('complete marks completed=1 and counts toward total', async () => {
    await repo.start({ id: 'p1', durationMin: 25 });
    await repo.complete('p1');
    const summary = await repo.summarize14d(new Date());
    expect(summary.totalFocusMin).toBe(25);
  });

  it('abandon does NOT count toward total', async () => {
    await repo.start({ id: 'p1', durationMin: 25 });
    await repo.abandon('p1');
    const summary = await repo.summarize14d(new Date());
    expect(summary.totalFocusMin).toBe(0);
  });

  it('summarize14d aggregates across multiple completed sessions', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.start({ id: `p${i}`, durationMin: 25 });
      await repo.complete(`p${i}`);
    }
    const summary = await repo.summarize14d(new Date());
    expect(summary.totalFocusMin).toBe(125);
    expect(summary.peakHourLocal).not.toBeNull();
  });

  it('summarize14d returns sensible defaults when no completed sessions exist', async () => {
    const summary = await repo.summarize14d(new Date());
    expect(summary.totalFocusMin).toBe(0);
    expect(summary.peakHourLocal).toBeNull();
    expect(summary.avgInterruptPerSession).toBe(0);
    expect(summary.trend).toBe('flat');
  });

  it('start is idempotent on id (no duplicate row)', async () => {
    await repo.start({ id: 'p1', durationMin: 25 });
    await repo.start({ id: 'p1', durationMin: 50 }); // should be no-op
    await repo.complete('p1');
    const summary = await repo.summarize14d(new Date());
    expect(summary.totalFocusMin).toBe(25); // first row's duration_min stuck
  });
});
