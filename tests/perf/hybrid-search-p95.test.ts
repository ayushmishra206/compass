import { describe, it, expect } from 'vitest';
import { buildCorpus, pseudoEmbedding, QUERIES } from './hybrid-search-helpers';

// PRD §11.8 gate: hybrid-search P95 ≤ 250ms at 10k notes.
// Runs as part of the standard `vitest run` flow. Uses pseudo-embeddings to
// isolate SQL/JS-cosine performance; retrieval *quality* is gated separately
// by the autolink-precision harness.

const CORPUS_SIZE = parseInt(process.env.COMPASS_PERF_N ?? '10000', 10);

describe('hybrid-search performance', () => {
  it(`p95 per single query ≤ 250 ms at ${CORPUS_SIZE} notes`, async () => {
    const repo = await buildCorpus(CORPUS_SIZE);
    const queryEmbeddings = QUERIES.map((_q, i) => pseudoEmbedding((i + 1) * 100003));

    // Warm caches: run a few queries first.
    for (let i = 0; i < 3; i++) {
      await repo.hybridSearch({
        query: QUERIES[i % QUERIES.length]!,
        queryEmbedding: queryEmbeddings[i % QUERIES.length]!,
        limit: 20,
      });
    }
    const samples: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      await repo.hybridSearch({
        query: QUERIES[i % QUERIES.length]!,
        queryEmbedding: queryEmbeddings[i % QUERIES.length]!,
        limit: 20,
      });
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)]!;
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;

    console.log(
      `hybrid-search p95 @ ${CORPUS_SIZE} notes: ${p95.toFixed(1)}ms (mean=${mean.toFixed(1)}ms)`,
    );
    expect(p95).toBeLessThanOrEqual(250);
  }, 600_000);
});
