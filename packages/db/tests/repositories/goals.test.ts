import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import { createGoalsRepo, type GoalsRepo } from '../../src/repositories/goals';
import type { Db } from '../../src/opfs';

let db: Db;
let repo: GoalsRepo;

const NOW = '2026-08-02T10:00:00.000Z';

const input = (over: Partial<Parameters<GoalsRepo['create']>[0]> = {}) => ({
  id: 'g1',
  horizon: 'quarter' as const,
  startDate: '2026-07-01',
  endDate: '2026-09-30',
  title: 'Ship the alpha',
  why: 'Because it has been sitting half-built.',
  ...over,
});

const decomposition = (over: Partial<Parameters<GoalsRepo['saveDecomposition']>[1]> = {}) => ({
  decomposedAt: NOW,
  modelId: 'test-model',
  dailyTemplates: ['One 90-minute block'],
  risks: ['Scope creep'],
  firstWeekFocus: 'Pick the smallest shippable slice.',
  milestones: [
    { id: 'm1', weekIndex: 1, title: 'Calendar lands', definitionOfDone: 'Merged.' },
    { id: 'm2', weekIndex: 2, title: 'Goals land', definitionOfDone: 'Merged.' },
  ],
  ...over,
});

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(db);
  repo = createGoalsRepo(db);
});

describe('create / get', () => {
  it('round-trips a goal', async () => {
    await repo.create(input(), NOW);
    const g = await repo.get('g1');
    expect(g?.title).toBe('Ship the alpha');
    expect(g?.why).toBe('Because it has been sitting half-built.');
    expect(g?.status).toBe('active');
  });

  it('starts with no decomposition', async () => {
    await repo.create(input(), NOW);
    const g = await repo.get('g1');
    expect(g?.decomposedAt).toBeNull();
    expect(g?.milestones).toEqual([]);
    expect(g?.dailyTemplates).toEqual([]);
  });

  it('allows a goal with no why', async () => {
    await repo.create(input({ why: undefined }), NOW);
    expect((await repo.get('g1'))?.why).toBeNull();
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.get('nope')).toBeNull();
  });
});

describe('list', () => {
  beforeEach(async () => {
    await repo.create(input({ id: 'a', endDate: '2026-12-31', title: 'Later' }), NOW);
    await repo.create(input({ id: 'b', endDate: '2026-09-30', title: 'Sooner' }), NOW);
  });

  it('orders by end date so the most urgent goal leads', async () => {
    expect((await repo.list()).map((g) => g.id)).toEqual(['b', 'a']);
  });

  it('filters by status', async () => {
    await repo.update('a', { status: 'achieved' });
    expect((await repo.list('active')).map((g) => g.id)).toEqual(['b']);
    expect((await repo.list('achieved')).map((g) => g.id)).toEqual(['a']);
  });

  it('returns an empty list when nothing matches', async () => {
    expect(await repo.list('abandoned')).toEqual([]);
  });
});

describe('update', () => {
  beforeEach(async () => {
    await repo.create(input(), NOW);
  });

  it('changes the title', async () => {
    await repo.update('g1', { title: 'Ship the beta' });
    expect((await repo.get('g1'))?.title).toBe('Ship the beta');
  });

  it('changes status', async () => {
    await repo.update('g1', { status: 'paused' });
    expect((await repo.get('g1'))?.status).toBe('paused');
  });

  it('leaves untouched fields alone', async () => {
    await repo.update('g1', { status: 'paused' });
    expect((await repo.get('g1'))?.title).toBe('Ship the alpha');
  });

  it('is a no-op for an empty patch', async () => {
    await expect(repo.update('g1', {})).resolves.toBeUndefined();
    expect((await repo.get('g1'))?.title).toBe('Ship the alpha');
  });
});

describe('saveDecomposition', () => {
  beforeEach(async () => {
    await repo.create(input(), NOW);
  });

  it('stores the plan and its milestones', async () => {
    await repo.saveDecomposition('g1', decomposition());
    const g = await repo.get('g1');
    expect(g?.decomposedAt).toBe(NOW);
    expect(g?.modelId).toBe('test-model');
    expect(g?.firstWeekFocus).toBe('Pick the smallest shippable slice.');
    expect(g?.milestones.map((m) => m.title)).toEqual(['Calendar lands', 'Goals land']);
  });

  it('round-trips JSON-encoded arrays', async () => {
    await repo.saveDecomposition('g1', decomposition());
    const g = await repo.get('g1');
    expect(g?.dailyTemplates).toEqual(['One 90-minute block']);
    expect(g?.risks).toEqual(['Scope creep']);
  });

  it('orders milestones by week', async () => {
    await repo.saveDecomposition(
      'g1',
      decomposition({
        milestones: [
          { id: 'm2', weekIndex: 9, title: 'Late', definitionOfDone: '' },
          { id: 'm1', weekIndex: 2, title: 'Early', definitionOfDone: '' },
        ],
      }),
    );
    expect((await repo.get('g1'))?.milestones.map((m) => m.title)).toEqual(['Early', 'Late']);
  });

  it('replaces the previous plan rather than interleaving two', async () => {
    await repo.saveDecomposition('g1', decomposition());
    await repo.saveDecomposition(
      'g1',
      decomposition({
        milestones: [{ id: 'new', weekIndex: 1, title: 'Rethought', definitionOfDone: '' }],
      }),
    );
    const g = await repo.get('g1');
    expect(g?.milestones).toHaveLength(1);
    expect(g?.milestones[0]?.title).toBe('Rethought');
  });
});

describe('setMilestoneDone', () => {
  beforeEach(async () => {
    await repo.create(input(), NOW);
    await repo.saveDecomposition('g1', decomposition());
  });

  it('marks a milestone complete and stamps the time', async () => {
    await repo.setMilestoneDone('m1', true, NOW);
    const g = await repo.get('g1');
    const m = g?.milestones.find((x) => x.id === 'm1');
    expect(m?.done).toBe(true);
    expect(m?.completedAt).toBe(NOW);
  });

  it('clears the timestamp when unticked', async () => {
    await repo.setMilestoneDone('m1', true, NOW);
    await repo.setMilestoneDone('m1', false, NOW);
    const m = (await repo.get('g1'))?.milestones.find((x) => x.id === 'm1');
    expect(m?.done).toBe(false);
    expect(m?.completedAt).toBeNull();
  });

  it('leaves sibling milestones untouched', async () => {
    await repo.setMilestoneDone('m1', true, NOW);
    const m2 = (await repo.get('g1'))?.milestones.find((x) => x.id === 'm2');
    expect(m2?.done).toBe(false);
  });
});

describe('remove', () => {
  it('deletes the goal and its milestones', async () => {
    await repo.create(input(), NOW);
    await repo.saveDecomposition('g1', decomposition());
    await repo.remove('g1');

    expect(await repo.get('g1')).toBeNull();
    const orphans = db.exec({
      sql: 'SELECT COUNT(*) FROM milestones',
      returnValue: 'resultRows',
    }) as Array<Array<unknown>>;
    expect(orphans[0]?.[0]).toBe(0);
  });
});
