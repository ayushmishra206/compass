import { describe, it, expect } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../../src/migration-runner';
import { createNotesRepo } from '../../src/repositories/notes';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../../../tests/prompt-eval/notes.autolink.fixture.json');

interface Fixture {
  notes: Array<{ id: string; title: string; body: string; cluster: string }>;
  groundTruthPairs: Array<[string, string, boolean]>;
}

// Real-model precision evaluation needs HF transformers.js + MiniLM weights.
// Gated behind COMPASS_RUN_AUTOLINK_PRECISION=1 because:
// 1. First run downloads ~80MB of weights from HF CDN.
// 2. Embedding all 27 fixture notes takes ~15-30s on a developer laptop.
// 3. We don't want every `pnpm test` to pay that cost.
//
// CI workflow runs this on a schedule (weekly) against the canonical fixture.
// Local: `COMPASS_RUN_AUTOLINK_PRECISION=1 pnpm --filter @compass/db test autolink-precision`
const SHOULD_RUN = process.env.COMPASS_RUN_AUTOLINK_PRECISION === '1';

describe.skipIf(!SHOULD_RUN)('autolink precision @ curated fixture', () => {
  it('hits ≥ 0.80 precision at threshold 0.78', async () => {
    // Dynamic import: only load the embeddings runtime when we actually run
    // the gated test. Keeps the model download out of the fast vitest path.
    const { embed } = await import('@compass/embeddings');

    const raw = readFileSync(FIXTURE, 'utf8');
    const fx = JSON.parse(raw) as Fixture;

    const sqlite3 = await sqlite3InitModule();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = new sqlite3.oo1.DB(':memory:', 'c') as any;
    await runMigrations(db);
    const repo = createNotesRepo(db);

    const idMap = new Map<string, string>();
    for (const n of fx.notes) {
      const uuid = await repo.create({
        title: n.title,
        body: n.body,
        tags: [n.cluster],
        embeddingModel: 'minilm-l6-v2',
      });
      idMap.set(n.id, uuid);
      const e = await embed(`${n.title}\n${n.body}`);
      await repo.upsertChunks(uuid, [{ text: `${n.title}\n${n.body}`, embedding: e }]);
    }

    const THRESHOLD = 0.78;
    let truePos = 0;
    let predicted = 0;
    for (const n of fx.notes) {
      const srcUuid = idMap.get(n.id)!;
      const neighbors = await repo.findNeighbors(srcUuid, { k: 10, threshold: THRESHOLD });
      for (const nb of neighbors) {
        const targetFixtureId = [...idMap.entries()].find(([, v]) => v === nb.noteId)?.[0];
        if (!targetFixtureId) continue;
        predicted++;
        const gt = fx.groundTruthPairs.find(
          ([a, b]) =>
            (a === n.id && b === targetFixtureId) || (a === targetFixtureId && b === n.id),
        );
        if (gt && gt[2] === true) truePos++;
      }
    }
    const precision = predicted === 0 ? 0 : truePos / predicted;

    console.log(
      `autolink precision @ threshold ${THRESHOLD}: ${precision.toFixed(3)} (TP=${truePos} predicted=${predicted})`,
    );
    expect(precision).toBeGreaterThanOrEqual(0.8);
  }, 180_000);
});

describe('autolink fixture shape', () => {
  it('parses fixture JSON with the expected fields', () => {
    const raw = readFileSync(FIXTURE, 'utf8');
    const fx = JSON.parse(raw) as Fixture;
    expect(fx.notes.length).toBeGreaterThanOrEqual(20);
    expect(fx.groundTruthPairs.length).toBeGreaterThanOrEqual(50);
    for (const n of fx.notes) {
      expect(n.id).toMatch(/^n\d{3}$/);
      expect(n.title.length).toBeGreaterThan(0);
      expect(n.body.length).toBeGreaterThan(0);
      expect(n.cluster.length).toBeGreaterThan(0);
    }
  });
});
