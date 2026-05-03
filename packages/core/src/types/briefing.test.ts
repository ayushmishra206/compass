import { describe, it, expect } from 'vitest';
import { AgentBriefingSchema } from './briefing';

describe('AgentBriefing schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = AgentBriefingSchema.safeParse({
      id: 'br1',
      kind: 'morning',
      generatedAt: '2026-04-26T08:00:00Z',
      forDate: '2026-04-26',
      modelId: 'anthropic/claude-haiku-4-5',
      tokensUsed: { prompt: 100, completion: 50, cached: 10 },
      inputs: {
        now: '2026-04-26T08:00:00Z',
        timezone: 'UTC',
        user: { name: 'Alice' },
      },
      output: {
        oneLineMood: 'productive',
        tldr: 'Work on schemas',
        topPriority: {
          title: 'Fix specs',
          why: 'Required for release',
          suggestedFocusMinutes: 90,
        },
        recovery: {
          note: 'Take a break',
          suggestBreak: true,
        },
      },
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(AgentBriefingSchema.safeParse({ id: 'br1' }).success).toBe(false);
  });
});
