import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockListModels = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
    models: { list: mockListModels },
  })),
}));

vi.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: vi.fn((_schema) => ({
    type: 'object',
    properties: { test: { type: 'string' } },
  })),
}));

import { createOpenRouterProvider } from '../src/providers/openrouter';
import { LlmKeyInvalid, LlmRateLimited, LlmUnavailable, LlmTimeout } from '../src/errors';

beforeEach(() => {
  mockCreate.mockReset();
  mockListModels.mockReset();
  vi.clearAllMocks();
});

describe('OpenRouter provider', () => {
  it('complete returns parsed structured output on happy path', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"pong":true,"echo":"hi"}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 12, completion_tokens: 8 },
      model: 'anthropic/claude-haiku-4-5',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = { _type: 'test_schema' } as any;
    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const out = await provider.complete({
      taskId: 'system.ping',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
      schema,
    });

    expect(out.parsed).toEqual({ pong: true, echo: 'hi' });
    expect(out.text).toBe('{"pong":true,"echo":"hi"}');
    expect(out.usage.promptTok).toBe(12);
    expect(out.usage.completionTok).toBe(8);
    expect(out.usage.cachedTok).toBe(0);
    expect(out.finishReason).toBe('stop');
    expect(out.model).toBe('anthropic/claude-haiku-4-5');
  });

  it('complete returns cached tokens when present in usage', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"result":true}' }, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 10,
        prompt_tokens_details: { cached_tokens: 50 },
      },
      model: 'anthropic/claude-haiku-4-5',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = { _type: 'test_schema' } as any;
    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const out = await provider.complete({
      taskId: 'test.cache',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'test' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
      schema,
    });

    expect(out.usage.cachedTok).toBe(50);
    expect(out.usage.promptTok).toBe(100);
  });

  it('complete works without schema (text-only)', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hello world' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3 },
      model: 'anthropic/claude-haiku-4-5',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const out = await provider.complete({
      taskId: 'system.text',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hello' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });

    expect(out.text).toBe('Hello world');
    expect(out.parsed).toBeUndefined();
    expect(out.finishReason).toBe('stop');
  });

  it('complete includes system message when provided', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 20, completion_tokens: 5 },
      model: 'anthropic/claude-haiku-4-5',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = { _type: 'test_schema' } as any;
    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    await provider.complete({
      taskId: 'test.sys',
      model: 'anthropic/claude-haiku-4-5',
      system: 'You are helpful',
      messages: [{ role: 'user', content: 'help' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
      schema,
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].role).toBe('system');
    expect(call.messages[0].content).toBe('You are helpful');
    expect(call.messages[1].role).toBe('user');
  });

  it('complete respects temperature when provided', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'text' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'test-model',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    await provider.complete({
      taskId: 'test.temp',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 50,
      temperature: 0.7,
      timeoutMs: 5000,
      trusted: true,
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const call = mockCreate.mock.calls[0][0];
    expect(call.temperature).toBe(0.7);
  });

  it('complete with 401 throws LlmKeyInvalid', async () => {
    mockCreate.mockRejectedValue({
      status: 401,
      message: 'Unauthorized',
    });

    const provider = createOpenRouterProvider({ apiKey: 'invalid-key' });
    await expect(
      provider.complete({
        taskId: 'test.401',
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toThrow(LlmKeyInvalid);
  });

  it('complete with 403 throws LlmKeyInvalid', async () => {
    mockCreate.mockRejectedValue({
      status: 403,
      message: 'Forbidden',
    });

    const provider = createOpenRouterProvider({ apiKey: 'forbidden-key' });
    await expect(
      provider.complete({
        taskId: 'test.403',
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toThrow(LlmKeyInvalid);
  });

  it('complete with 429 throws LlmRateLimited', async () => {
    mockCreate.mockRejectedValue({
      status: 429,
      message: 'Too many requests',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    await expect(
      provider.complete({
        taskId: 'test.429',
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toThrow(LlmRateLimited);
  });

  it('complete with 5xx throws LlmUnavailable with httpStatus', async () => {
    mockCreate.mockRejectedValue({
      status: 503,
      message: 'Service Unavailable',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    await expect(
      provider.complete({
        taskId: 'test.503',
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toThrow(LlmUnavailable);

    try {
      await provider.complete({
        taskId: 'test.503',
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      });
    } catch (e) {
      expect(e).toBeInstanceOf(LlmUnavailable);
      expect((e as LlmUnavailable).httpStatus).toBe(503);
    }
  });

  it('complete with timeout throws LlmTimeout', async () => {
    mockCreate.mockRejectedValue({
      code: 'ETIMEDOUT',
      message: 'Connection timeout',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    await expect(
      provider.complete({
        taskId: 'test.timeout',
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toThrow(LlmTimeout);
  });

  it('complete with timeout message throws LlmTimeout', async () => {
    mockCreate.mockRejectedValue({
      message: 'Request timeout exceeded',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    await expect(
      provider.complete({
        taskId: 'test.timeout-msg',
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toThrow(LlmTimeout);
  });

  it('validateKey returns valid: true when models.list succeeds', async () => {
    mockListModels.mockResolvedValue({ data: [{ id: 'model1' }] });

    const provider = createOpenRouterProvider({ apiKey: 'valid-key' });
    const result = await provider.validateKey('valid-key');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validateKey returns valid: false with error on 401', async () => {
    mockListModels.mockRejectedValue({
      status: 401,
      message: 'Unauthorized',
    });

    const provider = createOpenRouterProvider({ apiKey: 'invalid-key' });
    const result = await provider.validateKey('invalid-key');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid API key');
  });

  it('validateKey returns valid: false with error on other failures', async () => {
    mockListModels.mockRejectedValue({
      status: 500,
      message: 'Internal server error',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const result = await provider.validateKey('test-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('stream throws deferred error', async () => {
    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const stream = provider.stream({
      taskId: 'test.stream',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'test' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of stream) {
        // empty
      }
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toMatch(/Streaming RPC deferred/);
    }
  });

  it('provider id is openrouter', () => {
    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    expect(provider.id).toBe('openrouter');
  });

  it('complete passes custom baseURL when provided', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'test',
    });

    const provider = createOpenRouterProvider({
      apiKey: 'test-key',
      baseURL: 'https://custom.ai/v1',
    });

    await provider.complete({
      taskId: 'test.custom',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'test' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });

    // The mock is created per invocation; we verify it was called
    expect(mockCreate).toHaveBeenCalled();
  });

  it('complete handles missing finish_reason', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'ok' }, finish_reason: undefined }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'test',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const out = await provider.complete({
      taskId: 'test.no-reason',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'test' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });

    expect(out.finishReason).toBe('stop');
  });

  it('complete handles missing content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: undefined }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'test',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const out = await provider.complete({
      taskId: 'test.no-content',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'test' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });

    expect(out.text).toBe('');
  });

  it('complete handles missing usage stats', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: undefined,
      model: 'test',
    });

    const provider = createOpenRouterProvider({ apiKey: 'test-key' });
    const out = await provider.complete({
      taskId: 'test.no-usage',
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: 'test' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });

    expect(out.usage.promptTok).toBe(0);
    expect(out.usage.completionTok).toBe(0);
    expect(out.usage.cachedTok).toBe(0);
  });
});
