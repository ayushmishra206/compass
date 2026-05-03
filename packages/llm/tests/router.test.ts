import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetActiveCredentials = vi.fn();
const mockComplete = vi.fn();
const mockRecordCall = vi.fn();

vi.mock('@compass/core', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@compass/core')>();
  return {
    ...actual,
    getActiveCredentials: mockGetActiveCredentials,
  };
});

vi.mock('../src/providers/openrouter', () => ({
  createOpenRouterProvider: () => ({
    id: 'openrouter',
    complete: mockComplete,
    stream: () => {
      throw new Error('not used');
    },
    validateKey: () => Promise.resolve({ valid: true }),
  }),
}));

vi.mock('../src/ledger', () => ({
  recordCall: mockRecordCall,
  getMonthlySpend: vi.fn(),
}));

beforeEach(() => {
  mockGetActiveCredentials.mockReset();
  mockComplete.mockReset();
  mockRecordCall.mockReset();
});

// Import the module under test AFTER mocks are set up
const { executeTask } = await import('../src/router');

describe('executeTask', () => {
  it('throws on unknown taskId', async () => {
    mockGetActiveCredentials.mockResolvedValue({
      default: 'openrouter',
      openrouter: { apiKey: 'sk-or-test', addedAt: '2026-04-26T00:00:00Z' },
    });
    await expect(executeTask('not.a.real.task', { messages: [] })).rejects.toThrow(
      /Unknown taskId/,
    );
  });

  it('throws LlmKeyMissing when no credentials', async () => {
    mockGetActiveCredentials.mockResolvedValue({ default: null });
    await expect(executeTask('system.ping', { messages: [] })).rejects.toThrow(/key/i);
  });

  it('happy path writes a ledger row', async () => {
    mockGetActiveCredentials.mockResolvedValue({
      default: 'openrouter',
      openrouter: { apiKey: 'sk-or-test', addedAt: '2026-04-26T00:00:00Z' },
    });
    mockComplete.mockResolvedValue({
      parsed: { pong: true, echo: 'hi' },
      text: '',
      usage: { promptTok: 10, cachedTok: 0, completionTok: 5 },
      model: 'anthropic/claude-haiku-4-5',
      finishReason: 'stop',
    });
    const out = await executeTask('system.ping', {
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(out.parsed).toEqual({ pong: true, echo: 'hi' });
    expect(mockRecordCall).toHaveBeenCalledTimes(1);
    expect(mockRecordCall.mock.calls[0]![0]).toMatchObject({
      feature: 'system.ping',
      provider: 'openrouter',
      promptTok: 10,
      completionTok: 5,
    });
  });
});
