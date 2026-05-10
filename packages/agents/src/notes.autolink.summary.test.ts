import { describe, it, expect, vi } from 'vitest';
import { generateAutolinkSummary } from './notes.autolink.summary';
import type { LlmRouter } from './brief.morning';

function stubRouter(parsed: unknown): LlmRouter {
  return {
    executeTask: vi.fn().mockResolvedValue({
      parsed,
      text: JSON.stringify(parsed),
      usage: { promptTok: 100, cachedTok: 0, completionTok: 30 },
      model: 'claude-haiku-4-5',
      finishReason: 'stop',
    }),
  };
}

describe('generateAutolinkSummary', () => {
  it('passes both notes to the router and returns the rationale', async () => {
    const router = stubRouter({ rationale: 'Both discuss Q2 launch blockers.' });
    const result = await generateAutolinkSummary({
      router,
      noteA: { title: 'A', body: 'Q2 launch risks' },
      noteB: { title: 'B', body: 'Q2 product blockers' },
    });
    expect(result.rationale).toContain('Q2');
    expect(router.executeTask).toHaveBeenCalledOnce();
    const call = (router.executeTask as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.taskId).toBe('notes.autolink.summary');
    expect(call.trusted).toBe(true);
  });

  it('truncates very long bodies before sending', async () => {
    const router = stubRouter({ rationale: 'short' });
    const longBody = 'x'.repeat(10_000);
    await generateAutolinkSummary({
      router,
      noteA: { title: 'A', body: longBody },
      noteB: { title: 'B', body: longBody },
    });
    const call = (router.executeTask as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const messageText = JSON.stringify(call.messages);
    expect(messageText.length).toBeLessThan(8_000);
  });
});
