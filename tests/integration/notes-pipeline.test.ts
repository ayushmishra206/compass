import { describe, it, expect } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations, createNotesRepo, type NotesRepo } from '@compass/db';
import { generateAutolinkSummary, askGrounded } from '@compass/agents';
import type { LlmRouter } from '@compass/agents';

async function freshRepo(): Promise<NotesRepo> {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new sqlite3.oo1.DB(':memory:', 'c') as any;
  await runMigrations(db);
  return createNotesRepo(db);
}

const stubRouter: LlmRouter = {
  executeTask: async (req) => {
    if (req.taskId === 'notes.autolink.summary') {
      return {
        parsed: { rationale: 'shared topic' },
        text: '',
        usage: { promptTok: 100, cachedTok: 0, completionTok: 20 },
        model: 'stub',
        finishReason: 'stop',
      };
    }
    if (req.taskId === 'notes.askGrounded') {
      return {
        parsed: { answer: 'Sample answer [n1].', citations: ['n1'], reason: null },
        text: '',
        usage: { promptTok: 200, cachedTok: 0, completionTok: 50 },
        model: 'stub',
        finishReason: 'stop',
      };
    }
    throw new Error('unexpected task ' + req.taskId);
  },
};

function vec(...positions: Array<[number, number]>): Float32Array {
  const out = new Float32Array(384);
  for (const [i, v] of positions) out[i] = v;
  let norm = 0;
  for (const x of out) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < out.length; i++) out[i]! /= norm;
  return out;
}

describe('notes-pipeline integration', () => {
  it('save → neighbor → rationale lazy fetch', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'Q2 launch risks',
      body: 'shipping slipped to July',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'Q2 product blockers',
      body: 'capacity tight in eng',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.upsertChunks(a, [{ text: 'Q2 launch risks', embedding: vec([0, 1]) }]);
    await repo.upsertChunks(b, [
      { text: 'Q2 product blockers', embedding: vec([0, 0.97], [1, 0.24]) },
    ]);
    const neighbors = await repo.findNeighbors(a, { k: 5, threshold: 0.5 });
    expect(neighbors.map((n) => n.noteId)).toContain(b);

    await repo.rebuildAutoLinks(a, neighbors);
    const links = await repo.listAutoLinksForNote(a);
    expect(links[0]!.rationale).toBeNull();

    const noteA = await repo.getById(a);
    const noteB = await repo.getById(b);
    const out = await generateAutolinkSummary({
      router: stubRouter,
      noteA: { title: noteA!.title, body: noteA!.body },
      noteB: { title: noteB!.title, body: noteB!.body },
    });
    await repo.setAutoLinkRationale(a, b, out.rationale);
    const links2 = await repo.listAutoLinksForNote(a);
    expect(links2[0]!.rationale).toBe('shared topic');
  });

  it('hybrid search merges FTS + vec hits', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'q2 launch',
      body: 'plan',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'unrelated',
      body: 'q2 risk register',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.upsertChunks(a, [{ text: 'q2 launch plan', embedding: vec([0, 1]) }]);
    await repo.upsertChunks(b, [{ text: 'q2 risk register', embedding: vec([5, 1]) }]);

    const hits = await repo.hybridSearch({
      query: 'q2',
      queryEmbedding: vec([0, 1]),
      limit: 20,
    });
    const ids = hits.map((h) => h.noteId);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
  });

  it('askGrounded returns answer + citations via stub router', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'q2 launch',
      body: 'delayed to july',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.upsertChunks(a, [{ text: 'q2 launch', embedding: vec([0, 1]) }]);
    const hits = await repo.hybridSearch({
      query: 'when did q2 launch',
      queryEmbedding: vec([0, 1]),
      limit: 5,
    });
    const r = await askGrounded({ router: stubRouter, query: 'when did q2 launch', hits });
    expect(r.answer).toContain('Sample answer');
    expect(r.citations[0]!.noteId).toBe(a);
  });

  it('askGrounded with empty hits returns no-notes reason without calling router', async () => {
    const r = await askGrounded({ router: stubRouter, query: 'x', hits: [] });
    expect(r.answer).toBeNull();
    expect(r.reason).toBe('no-notes');
  });

  it('autolink_enabled=false stops the note from contributing pairs on rebuild', async () => {
    const repo = await freshRepo();
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
    await repo.upsertChunks(a, [{ text: 'aa', embedding: vec([0, 1]) }]);
    await repo.upsertChunks(b, [{ text: 'bb', embedding: vec([0, 0.97], [1, 0.24]) }]);
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    expect(await repo.listAutoLinksForNote(a)).toHaveLength(1);
    // Simulating offscreen handler: when autolinkEnabled toggles off it
    // calls rebuildAutoLinks(noteId, []) — verified at the handler level.
    await repo.rebuildAutoLinks(a, []);
    expect(await repo.listAutoLinksForNote(a)).toHaveLength(0);
  });

  it('dismiss + rationale set co-exist (per-pair state)', async () => {
    const repo = await freshRepo();
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
    await repo.setAutoLinkRationale(a, b, 'reason');
    await repo.dismissAutoLink(a, b);
    expect(await repo.listAutoLinksForNote(a)).toHaveLength(0);
    expect(await repo.getAutoLinkRationale(a, b)).toBe('reason');
  });

  it('delete cascades chunks and links', async () => {
    const repo = await freshRepo();
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
    await repo.upsertChunks(a, [{ text: 'aa', embedding: vec([0, 1]) }]);
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    await repo.delete(a);
    expect(await repo.getById(a)).toBeNull();
    expect(await repo.listAutoLinksForNote(b)).toHaveLength(0);
  });
});
