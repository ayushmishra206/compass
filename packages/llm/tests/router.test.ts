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

const mockOpenAiComplete = vi.fn();
const mockAnthropicComplete = vi.fn();

vi.mock('../src/providers/openai', () => ({
  createOpenAiProvider: () => ({
    id: 'openai',
    complete: mockOpenAiComplete,
    stream: () => {
      throw new Error('not used');
    },
    validateKey: () => Promise.resolve({ valid: true }),
  }),
}));

vi.mock('../src/providers/anthropic', () => ({
  createAnthropicProvider: () => ({
    id: 'anthropic',
    complete: mockAnthropicComplete,
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
  mockOpenAiComplete.mockReset();
  mockAnthropicComplete.mockReset();
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

  it('passes route.models[providerId] as req.model', async () => {
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
    await executeTask('system.ping', {
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockComplete.mock.calls[0]![0]).toMatchObject({
      taskId: 'system.ping',
      model: 'anthropic/claude-haiku-4-5',
    });
    // No `_model` cast anywhere
    expect(mockComplete.mock.calls[0]![0]).not.toHaveProperty('_model');
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

  it('dispatches to OpenAI provider when default is openai', async () => {
    mockGetActiveCredentials.mockResolvedValue({
      default: 'openai',
      openai: { apiKey: 'sk-openai-test', addedAt: '2026-05-03T00:00:00Z' },
    });
    mockOpenAiComplete.mockResolvedValue({
      parsed: { pong: true, echo: 'hi' },
      text: '',
      usage: { promptTok: 10, cachedTok: 0, completionTok: 5 },
      model: 'gpt-4o-mini',
      finishReason: 'stop',
    });
    const out = await executeTask('system.ping', {
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(mockOpenAiComplete).toHaveBeenCalledTimes(1);
    expect(mockOpenAiComplete.mock.calls[0]![0].model).toBe('gpt-4o-mini');
    expect(mockComplete).not.toHaveBeenCalled();
    expect(out.parsed).toEqual({ pong: true, echo: 'hi' });
    expect(mockRecordCall.mock.calls[0]![0]).toMatchObject({ provider: 'openai' });
  });

  it('dispatches to Anthropic provider when default is anthropic', async () => {
    mockGetActiveCredentials.mockResolvedValue({
      default: 'anthropic',
      anthropic: { apiKey: 'sk-ant-test', addedAt: '2026-05-03T00:00:00Z' },
    });
    mockAnthropicComplete.mockResolvedValue({
      parsed: { pong: true, echo: 'hi' },
      text: '',
      usage: { promptTok: 10, cachedTok: 0, completionTok: 5 },
      model: 'claude-haiku-4-5',
      finishReason: 'stop',
    });
    const out = await executeTask('system.ping', {
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(mockAnthropicComplete).toHaveBeenCalledTimes(1);
    expect(mockAnthropicComplete.mock.calls[0]![0].model).toBe('claude-haiku-4-5');
    expect(out.parsed).toEqual({ pong: true, echo: 'hi' });
    expect(mockRecordCall.mock.calls[0]![0]).toMatchObject({ provider: 'anthropic' });
  });
});
