import { describe, it, expect, vi } from 'vitest';
import { askGrounded } from './notes.askGrounded';
import type { LlmRouter } from './brief.morning';

function stubRouter(parsed: unknown): LlmRouter {
  return {
    executeTask: vi.fn().mockResolvedValue({
      parsed,
      text: JSON.stringify(parsed),
      usage: { promptTok: 200, cachedTok: 0, completionTok: 50 },
      model: 'claude-sonnet-4-6',
      finishReason: 'stop',
    }),
  };
}

describe('askGrounded', () => {
  it('passes hits as <note id="n1"> blocks and returns answer + citations', async () => {
    const router = stubRouter({
      answer: 'Q2 launch was delayed [n1].',
      citations: ['n1'],
      reason: null,
    });
    const result = await askGrounded({
      router,
      query: 'when did q2 launch',
      hits: [
        { noteId: 'noteA', title: 'Q2 launch', excerpt: 'we delayed launch to July', score: 1 },
        { noteId: 'noteB', title: 'Standup', excerpt: 'misc', score: 0.5 },
      ],
    });
    expect(result.answer).toContain('[n1]');
    expect(result.citations).toEqual([{ id: 'n1', noteId: 'noteA' }]);
    const userMsg = (router.executeTask as ReturnType<typeof vi.fn>).mock.calls[0]![0].messages[0]
      .content as string;
    expect(userMsg).toContain('<note id="n1">');
    expect(userMsg).toContain('<note id="n2">');
  });

  it('returns null answer + reason no-notes when hits is empty', async () => {
    const router = { executeTask: vi.fn() };
    const result = await askGrounded({
      router: router as unknown as LlmRouter,
      query: 'x',
      hits: [],
    });
    expect(result.answer).toBeNull();
    expect(result.citations).toEqual([]);
    expect(result.reason).toBe('no-notes');
    expect(router.executeTask).not.toHaveBeenCalled();
  });

  it('drops citations the model fabricated outside the provided context ids', async () => {
    const router = stubRouter({
      answer: 'something [n1] [n9].',
      citations: ['n1', 'n9'],
      reason: null,
    });
    const result = await askGrounded({
      router,
      query: 'q',
      hits: [{ noteId: 'noteA', title: 'A', excerpt: 'a', score: 1 }],
    });
    expect(result.citations).toEqual([{ id: 'n1', noteId: 'noteA' }]);
  });
});
