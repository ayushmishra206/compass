import { bench, describe } from 'vitest';
import { buildCorpus, pseudoEmbedding, QUERIES } from './hybrid-search-helpers';

// Synthetic 10k-note corpus. We use deterministic pseudo-embeddings (seeded
// random normalized 384-dim vectors) — the bench measures the SQL + JS-cosine
// hot path, not retrieval quality. Real retrieval quality is gated by the
// autolink-precision harness (real MiniLM, env-gated).

const CORPUS_SIZE = parseInt(process.env.COMPASS_BENCH_N ?? '10000', 10);

const repo = await buildCorpus(CORPUS_SIZE);
const queryEmbeddings = QUERIES.map((_q, i) => pseudoEmbedding((i + 1) * 100003));

describe(`hybrid-search @ ${CORPUS_SIZE} notes`, () => {
  bench(
    'hybridSearch (10 queries per iter)',
    async () => {
      for (let i = 0; i < QUERIES.length; i++) {
        await repo.hybridSearch({
          query: QUERIES[i]!,
          queryEmbedding: queryEmbeddings[i]!,
          limit: 20,
        });
      }
    },
    { iterations: 20, warmupIterations: 2 },
  );
});
