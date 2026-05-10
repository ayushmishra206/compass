import { describe, it, expect, beforeEach } from 'vitest';
import { embedBatch, embed, __resetForTests, __setPipeForTests } from '../src/runtime';

const DIM = 384;

function fakePipe(_options?: unknown) {
  // The fake mirrors transformers.js's feature-extraction shape:
  // single string -> Float32Array of length DIM
  // array of N strings -> Float32Array of length N*DIM (concatenated)
  return async (input: string | string[]) => {
    const texts = Array.isArray(input) ? input : [input];
    const data = new Float32Array(texts.length * DIM);
    for (let i = 0; i < texts.length; i++) {
      // Deterministic, normalized vector: a single 1.0 in slot (i % DIM).
      data[i * DIM + (i % DIM)] = 1.0;
    }
    return { data };
  };
}

describe('embedBatch', () => {
  beforeEach(() => {
    __resetForTests();
    __setPipeForTests(fakePipe());
  });

  it('returns N normalized 384-dim vectors for N inputs', async () => {
    const out = await embedBatch(['hello world', 'second chunk', 'third']);
    expect(out).toHaveLength(3);
    for (const v of out) {
      expect(v).toBeInstanceOf(Float32Array);
      expect(v.length).toBe(DIM);
      const norm = Math.sqrt(Array.from(v).reduce((s, x) => s + x * x, 0));
      expect(norm).toBeCloseTo(1, 5);
    }
  });

  it('handles a single-item batch', async () => {
    const out = await embedBatch(['only one']);
    expect(out).toHaveLength(1);
    expect(out[0].length).toBe(DIM);
  });

  it('returns an empty array for empty input', async () => {
    const out = await embedBatch([]);
    expect(out).toEqual([]);
  });

  it('throws when the underlying pipeline returns wrong shape', async () => {
    __setPipeForTests(async () => ({ data: new Float32Array(99) }));
    await expect(embedBatch(['x', 'y'])).rejects.toThrow(/expected 768 floats/);
  });
});

describe('embed (single)', () => {
  beforeEach(() => {
    __resetForTests();
    __setPipeForTests(fakePipe());
  });

  it('returns a 384-dim vector', async () => {
    const v = await embed('hello');
    expect(v.length).toBe(DIM);
  });
});
