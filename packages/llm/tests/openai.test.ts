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

import { createOpenAiProvider } from '../src/providers/openai';
import { LlmKeyInvalid, LlmRateLimited, LlmUnavailable, LlmTimeout } from '../src/errors';

beforeEach(() => {
  mockCreate.mockReset();
  mockListModels.mockReset();
  vi.clearAllMocks();
});

describe('OpenAI direct provider', () => {
  it('complete returns parsed structured output on happy path', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"pong":true,"echo":"hi"}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 12, completion_tokens: 8 },
      model: 'gpt-4o-mini',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = { _type: 'test_schema' } as any;
    const provider = createOpenAiProvider({ apiKey: 'sk-test' });
    const out = await provider.complete({
      taskId: 'system.ping',
      model: 'gpt-4o-mini',
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
    expect(out.model).toBe('gpt-4o-mini');
  });

  it('complete maps 401 to LlmKeyInvalid', async () => {
    mockCreate.mockRejectedValue({ status: 401, message: 'Invalid API key' });
    const provider = createOpenAiProvider({ apiKey: 'sk-bad' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmKeyInvalid);
  });

  it('complete maps 429 to LlmRateLimited', async () => {
    mockCreate.mockRejectedValue({ status: 429, message: 'Rate limit' });
    const provider = createOpenAiProvider({ apiKey: 'sk-test' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmRateLimited);
  });

  it('complete maps 503 to LlmUnavailable', async () => {
    mockCreate.mockRejectedValue({ status: 503, message: 'Service unavailable' });
    const provider = createOpenAiProvider({ apiKey: 'sk-test' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmUnavailable);
  });

  it('complete maps timeout to LlmTimeout', async () => {
    mockCreate.mockRejectedValue({ code: 'ETIMEDOUT', message: 'request timeout' });
    const provider = createOpenAiProvider({ apiKey: 'sk-test' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmTimeout);
  });

  it('validateKey returns valid:true on successful models.list', async () => {
    mockListModels.mockResolvedValue({ data: [{ id: 'gpt-4o-mini' }] });
    const provider = createOpenAiProvider({ apiKey: 'sk-test' });
    const r = await provider.validateKey('sk-test');
    expect(r.valid).toBe(true);
  });

  it('validateKey returns valid:false on 401', async () => {
    mockListModels.mockRejectedValue({ status: 401, message: 'bad key' });
    const provider = createOpenAiProvider({ apiKey: 'sk-bad' });
    const r = await provider.validateKey('sk-bad');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Invalid API key');
  });
});
