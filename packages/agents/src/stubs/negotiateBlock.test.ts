import { describe, expect, it } from 'vitest';
import { BLOCK_RULES } from '@compass/core/fixtures';
import { negotiateBlock } from './negotiateBlock.js';

describe('negotiateBlock stub', () => {
  it('yields an assistant turn with offer', async () => {
    const turns = [];
    for await (const t of negotiateBlock(BLOCK_RULES[0]!, 'quick check')) {
      turns.push(t);
    }
    expect(turns.length).toBeGreaterThan(0);
    expect(turns[0]!.role).toBe('assistant');
    expect(turns[0]!.offer).toBe('grant_5min');
  });
});
