import { describe, it, expect } from 'vitest';
import { GmailActionExtractSchema } from './gmail';

describe('GmailActionExtract schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = GmailActionExtractSchema.safeParse({
      id: 'gm1',
      messageId: 'msg123',
      extractedAt: '2026-04-26T10:00:00Z',
      modelId: 'anthropic/claude-haiku-4-5',
      priority: 'p1',
      actions: [
        {
          title: 'Reply to John',
          owner: 'me',
          commitmentType: 'reply',
          sourceSpan: { start: 0, end: 10 },
          confidence: 0.95,
        },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(GmailActionExtractSchema.safeParse({ id: 'gm1' }).success).toBe(false);
  });
});
