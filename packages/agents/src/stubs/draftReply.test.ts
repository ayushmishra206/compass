import { describe, expect, it } from 'vitest';
import { draftReply } from './draftReply.js';

describe('draftReply stub', () => {
  it('streams growing-prefix chunks ending with the full draft', async () => {
    const chunks: string[] = [];
    for await (const chunk of draftReply({ id: 'a1' })) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i]!.length).toBeGreaterThanOrEqual(chunks[i - 1]!.length);
    }
    expect(chunks[chunks.length - 1]).toContain('three scenarios');
  }, 10_000);
});
