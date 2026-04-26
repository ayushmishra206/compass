import { describe, it, expect } from 'vitest';
import { CostLedgerRowSchema } from './ledger';

describe('CostLedgerRow schema', () => {
  it('parses a happy-path row', () => {
    expect(
      CostLedgerRowSchema.safeParse({
        id: 'r1',
        ts: '2026-04-26T10:00:00Z',
        feature: 'system.ping',
        provider: 'openrouter',
        model: 'anthropic/claude-haiku-4-5',
        promptTok: 50,
        cachedTok: 0,
        completionTok: 20,
        usdEstimated: 0.0001,
      }).success,
    ).toBe(true);
  });
  it('rejects negative tokens', () => {
    expect(
      CostLedgerRowSchema.safeParse({
        id: 'r1',
        ts: 't',
        feature: 'f',
        provider: 'openrouter',
        model: 'm',
        promptTok: -1,
        cachedTok: 0,
        completionTok: 0,
        usdEstimated: 0,
      }).success,
    ).toBe(false);
  });
});
