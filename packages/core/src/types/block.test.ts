import { describe, it, expect } from 'vitest';
import { BlockRuleSchema, BlockEventSchema } from './block';

describe('BlockRule schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = BlockRuleSchema.safeParse({
      id: 'br1',
      pattern: 'reddit.com',
      mode: 'soft',
      source: 'user',
      createdAt: '2026-04-26T10:00:00Z',
      strikes: 0,
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(BlockRuleSchema.safeParse({ id: 'br1' }).success).toBe(false);
  });
});

describe('BlockEvent schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = BlockEventSchema.safeParse({
      id: 'be1',
      ruleId: 'br1',
      occurredAt: '2026-04-26T10:00:00Z',
      url: 'reddit.com/r/programming',
      outcome: 'blocked',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects an invalid outcome', () => {
    expect(
      BlockEventSchema.safeParse({
        id: 'be1',
        ruleId: 'br1',
        occurredAt: '2026-04-26T10:00:00Z',
        url: 'reddit.com',
        outcome: 'invalid',
      }).success,
    ).toBe(false);
  });
});
