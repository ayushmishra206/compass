import { describe, expect, it } from 'vitest';
import { semanticSearch } from './semanticSearch.js';

describe('semanticSearch stub', () => {
  it('returns empty for empty query', async () => {
    expect(await semanticSearch('')).toEqual([]);
    expect(await semanticSearch('   ')).toEqual([]);
  });

  it('finds notes by token overlap', async () => {
    const hits = await semanticSearch('pricing meeting');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.score).toBeGreaterThan(0);
  });

  it('scores descending', async () => {
    const hits = await semanticSearch('compass architecture');
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i]!.score).toBeLessThanOrEqual(hits[i - 1]!.score);
    }
  });
});
