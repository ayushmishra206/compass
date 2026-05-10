import { describe, it, expect } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../src/migration-runner';
import { createNotesRepo } from '../../src/repositories/notes';
import type { Db } from '../../src/opfs';

async function freshDb(): Promise<Db> {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new sqlite3.oo1.DB(':memory:', 'c') as any;
  await runMigrations(db);
  return db;
}

function vec(...positions: Array<[number, number]>): Float32Array {
  // Build a 384-dim vector with the supplied positions filled and normalized.
  const out = new Float32Array(384);
  for (const [i, v] of positions) out[i] = v;
  let norm = 0;
  for (const x of out) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

describe('NotesRepo CRUD', () => {
  it('create + getById round-trips a note', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 'Q2 launch',
      body: 'blockers and risks',
      tags: ['work'],
      embeddingModel: 'minilm-l6-v2',
    });
    const got = await repo.getById(id);
    expect(got?.title).toBe('Q2 launch');
    expect(got?.body).toBe('blockers and risks');
    expect(got?.tags).toEqual(['work']);
    expect(got?.autolinkEnabled).toBe(true);
  });

  it('list returns notes sorted by updated_at DESC', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'x',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await new Promise((r) => setTimeout(r, 10));
    const b = await repo.create({
      title: 'b',
      body: 'y',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const all = await repo.list({ limit: 10, offset: 0 });
    expect(all.map((n) => n.id)).toEqual([b, a]);
  });

  it('update modifies fields and bumps updated_at', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const before = (await repo.getById(id))!.updatedAt;
    await new Promise((r) => setTimeout(r, 10));
    await repo.update(id, { body: 'b2' });
    const after = await repo.getById(id);
    expect(after?.body).toBe('b2');
    expect(after!.updatedAt > before).toBe(true);
  });

  it('delete removes the note', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.delete(id);
    expect(await repo.getById(id)).toBeNull();
  });
});

describe('NotesRepo chunks', () => {
  it('upsertChunks inserts rows; reset replaces them', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.upsertChunks(id, [
      { text: 'chunk a', embedding: vec([0, 1]) },
      { text: 'chunk b', embedding: vec([1, 1]) },
    ]);
    const r1 = db.exec({
      sql: 'SELECT COUNT(*) FROM note_chunks WHERE note_id=?',
      bind: [id],
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r1[0][0]).toBe(2);

    await repo.upsertChunks(id, [{ text: 'only', embedding: vec([0, 1]) }]);
    const r2 = db.exec({
      sql: 'SELECT COUNT(*) FROM note_chunks WHERE note_id=?',
      bind: [id],
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r2[0][0]).toBe(1);
  });

  it('delete cascades note_chunks rows', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.upsertChunks(id, [{ text: 'c', embedding: vec([0, 1]) }]);
    await repo.delete(id);
    const r = db.exec({
      sql: 'SELECT COUNT(*) FROM note_chunks',
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r[0][0]).toBe(0);
  });
});

describe('NotesRepo.findNeighbors', () => {
  it('returns notes with high cosine similarity, excluding the query note, above threshold', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const c = await repo.create({
      title: 'c',
      body: 'cc',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });

    await repo.upsertChunks(a, [{ text: 'aa', embedding: vec([0, 1]) }]);
    // b shares heavy weight with a's first dim
    await repo.upsertChunks(b, [{ text: 'bb', embedding: vec([0, 0.97], [1, 0.24]) }]);
    // c is orthogonal
    await repo.upsertChunks(c, [{ text: 'cc', embedding: vec([100, 1]) }]);

    const neighbors = await repo.findNeighbors(a, { k: 5, threshold: 0.8 });
    const ids = neighbors.map((n) => n.noteId);
    expect(ids).toContain(b);
    expect(ids).not.toContain(c);
    expect(ids).not.toContain(a);
  });

  it('respects k and ranks by similarity descending', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.upsertChunks(a, [{ text: 'aa', embedding: vec([0, 1]) }]);

    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const id = await repo.create({
        title: `n${i}`,
        body: `b${i}`,
        tags: [],
        embeddingModel: 'minilm-l6-v2',
      });
      // similarities will be 0.95, 0.94, ... by mixing in axis-1
      await repo.upsertChunks(id, [{ text: `t${i}`, embedding: vec([0, 1], [1, i * 0.05]) }]);
      ids.push(id);
    }
    const neighbors = await repo.findNeighbors(a, { k: 3, threshold: 0.5 });
    expect(neighbors).toHaveLength(3);
    for (let i = 1; i < neighbors.length; i++) {
      expect(neighbors[i - 1].similarity).toBeGreaterThanOrEqual(neighbors[i].similarity);
    }
  });
});

describe('NotesRepo auto_links', () => {
  it('rebuildAutoLinks replaces all pairs touching the note (symmetric storage)', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    const links = await repo.listAutoLinksForNote(a);
    expect(links).toHaveLength(1);
    expect(links[0].targetNoteId).toBe(b);
    expect(links[0].rationale).toBeNull();
    // Symmetric: the same row shows up when querying from b
    const linksFromB = await repo.listAutoLinksForNote(b);
    expect(linksFromB).toHaveLength(1);
    expect(linksFromB[0].targetNoteId).toBe(a);
  });

  it('dismissAutoLink hides the pair from listAutoLinksForNote', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    await repo.dismissAutoLink(a, b);
    expect(await repo.listAutoLinksForNote(a)).toHaveLength(0);
  });

  it('rebuildAutoLinks preserves dismissed + rationale on a kept pair', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.85 }]);
    await repo.setAutoLinkRationale(a, b, 'shared topic');
    await repo.dismissAutoLink(a, b);
    // Rebuild with the same neighbor (re-saved note still has the same pair).
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.91 }]);
    // Dismissed flag and rationale must survive.
    expect(await repo.getAutoLinkRationale(a, b)).toBe('shared topic');
    expect(await repo.listAutoLinksForNote(a)).toHaveLength(0); // still dismissed
    // Similarity should have been refreshed by the upsert.
    const raw = db.exec({
      sql: 'SELECT similarity FROM auto_links WHERE src_note_id=? AND target_note_id=?',
      bind: a < b ? [a, b] : [b, a],
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(raw[0]![0]).toBeCloseTo(0.91, 5);
  });

  it('rebuildAutoLinks removes pairs no longer in the neighbor set', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const c = await repo.create({
      title: 'c',
      body: 'cc',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [
      { noteId: b, similarity: 0.9 },
      { noteId: c, similarity: 0.85 },
    ]);
    expect(await repo.listAutoLinksForNote(a)).toHaveLength(2);
    // Drop c from the neighbor set on the next rebuild.
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.92 }]);
    const links = await repo.listAutoLinksForNote(a);
    expect(links).toHaveLength(1);
    expect(links[0]!.targetNoteId).toBe(b);
  });

  it('setAutoLinkRationale persists the rationale; getAutoLinkRationale reads it back', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    await repo.setAutoLinkRationale(a, b, 'both about Q2 launch blockers');
    expect(await repo.getAutoLinkRationale(a, b)).toBe('both about Q2 launch blockers');
    // Order-insensitive
    expect(await repo.getAutoLinkRationale(b, a)).toBe('both about Q2 launch blockers');
    const links = await repo.listAutoLinksForNote(a);
    expect(links[0].rationale).toBe('both about Q2 launch blockers');
    expect(links[0].rationaleAt).not.toBeNull();
  });
});

describe('NotesRepo.hybridSearch', () => {
  it('merges FTS and vec hits using reciprocal-rank fusion', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'q2 launch blockers',
      body: 'plan',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'unrelated topic',
      body: 'q2 risk register',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const c = await repo.create({
      title: 'standup notes',
      body: 'no overlap',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });

    await repo.upsertChunks(a, [{ text: 'plan', embedding: vec([0, 1]) }]);
    await repo.upsertChunks(b, [
      { text: 'q2 risk register', embedding: vec([0, 0.5], [1, 0.866]) },
    ]);
    await repo.upsertChunks(c, [{ text: 'no overlap', embedding: vec([200, 1]) }]);

    const hits = await repo.hybridSearch({
      query: 'q2',
      queryEmbedding: vec([0, 1]),
      limit: 20,
    });
    const ids = hits.map((h) => h.noteId);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
    // a should outrank c (a wins on vec; c is far on both)
    expect(ids.indexOf(a)).toBeLessThan(ids.indexOf(c) === -1 ? Infinity : ids.indexOf(c));
  });

  it('returns empty array when query yields no FTS or vec matches', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const hits = await repo.hybridSearch({
      query: 'nonexistent',
      queryEmbedding: vec([0, 1]),
      limit: 20,
    });
    expect(hits).toEqual([]);
  });
});
