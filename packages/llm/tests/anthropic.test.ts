import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMessagesCreate = vi.fn();
const mockModelsList = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
    models: { list: mockModelsList },
  })),
}));

vi.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: vi.fn((_schema) => ({
    type: 'object',
    properties: { pong: { type: 'boolean' }, echo: { type: 'string' } },
    required: ['pong', 'echo'],
  })),
}));

import { createAnthropicProvider } from '../src/providers/anthropic';
import { LlmKeyInvalid, LlmRateLimited, LlmUnavailable, LlmTimeout } from '../src/errors';

beforeEach(() => {
  mockMessagesCreate.mockReset();
  mockModelsList.mockReset();
  vi.clearAllMocks();
});

describe('Anthropic direct provider — tool-use synthesis', () => {
  it('complete returns parsed structured output via tool_use block', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: '__compass_response',
          id: 'toolu_test123',
          input: { pong: true, echo: 'hi' },
        },
      ],
      usage: { input_tokens: 12, output_tokens: 8 },
      model: 'claude-haiku-4-5',
      stop_reason: 'tool_use',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = { _type: 'test_schema' } as any;
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    const out = await provider.complete({
      taskId: 'system.ping',
      model: 'claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
      schema,
    });

    expect(out.parsed).toEqual({ pong: true, echo: 'hi' });
    expect(out.usage.promptTok).toBe(12);
    expect(out.usage.completionTok).toBe(8);
    expect(out.model).toBe('claude-haiku-4-5');
    expect(out.finishReason).toBe('stop');

    // Verify the request used tool-use synthesis
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    const call = mockMessagesCreate.mock.calls[0]![0];
    expect(call.tools).toBeDefined();
    expect(call.tools[0].name).toBe('__compass_response');
    expect(call.tools[0].input_schema).toEqual({
      type: 'object',
      properties: { pong: { type: 'boolean' }, echo: { type: 'string' } },
      required: ['pong', 'echo'],
    });
    expect(call.tool_choice).toEqual({ type: 'tool', name: '__compass_response' });
  });

  it('complete returns text-only response when schema is absent (tools omitted)', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Hello there!' }],
      usage: { input_tokens: 5, output_tokens: 4 },
      model: 'claude-haiku-4-5',
      stop_reason: 'end_turn',
    });

    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    const out = await provider.complete({
      taskId: 'system.ping',
      model: 'claude-haiku-4-5',
      messages: [{ role: 'user', content: 'say hi' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });

    expect(out.parsed).toBeUndefined();
    expect(out.text).toBe('Hello there!');
    expect(out.finishReason).toBe('stop');

    const call = mockMessagesCreate.mock.calls[0]![0];
    expect(call.tools).toBeUndefined();
    expect(call.tool_choice).toBeUndefined();
  });

  it('complete maps 401 to LlmKeyInvalid', async () => {
    mockMessagesCreate.mockRejectedValue({ status: 401, message: 'Invalid API key' });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-bad' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'claude-haiku-4-5',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmKeyInvalid);
  });

  it('complete maps 429 to LlmRateLimited', async () => {
    mockMessagesCreate.mockRejectedValue({ status: 429, message: 'Rate limit' });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'claude-haiku-4-5',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmRateLimited);
  });

  it('complete maps 503 to LlmUnavailable', async () => {
    mockMessagesCreate.mockRejectedValue({ status: 503, message: 'Service unavailable' });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'claude-haiku-4-5',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmUnavailable);
  });

  it('complete maps timeout to LlmTimeout', async () => {
    mockMessagesCreate.mockRejectedValue({ code: 'ETIMEDOUT', message: 'request timeout' });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    await expect(
      provider.complete({
        taskId: 'system.ping',
        model: 'claude-haiku-4-5',
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 50,
        timeoutMs: 5000,
        trusted: true,
      }),
    ).rejects.toBeInstanceOf(LlmTimeout);
  });

  it('validateKey returns valid:true on successful models.list', async () => {
    mockModelsList.mockResolvedValue({ data: [{ id: 'claude-haiku-4-5' }] });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    const r = await provider.validateKey('sk-ant-test');
    expect(r.valid).toBe(true);
  });

  it('validateKey returns valid:false on 401', async () => {
    mockModelsList.mockRejectedValue({ status: 401, message: 'bad key' });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-bad' });
    const r = await provider.validateKey('sk-ant-bad');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Invalid API key');
  });

  it('finishReason maps max_tokens to length', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'truncated...' }],
      usage: { input_tokens: 5, output_tokens: 50 },
      model: 'claude-haiku-4-5',
      stop_reason: 'max_tokens',
    });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    const out = await provider.complete({
      taskId: 'system.ping',
      model: 'claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 50,
      timeoutMs: 5000,
      trusted: true,
    });
    expect(out.finishReason).toBe('length');
  });
});
