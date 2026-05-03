import { describe, it, expect } from 'vitest';
import {
  LlmKeyMissing,
  LlmKeyInvalid,
  LlmRateLimited,
  LlmUnavailable,
  LlmSchemaError,
  LlmTimeout,
} from '../src/errors';

describe('LlmKeyMissing', () => {
  it('has the correct name and is an Error', () => {
    const e = new LlmKeyMissing();
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LlmKeyMissing);
    expect(e.name).toBe('LlmKeyMissing');
    expect(e.message).toBe('No LLM key configured');
  });
});

describe('LlmKeyInvalid', () => {
  it('has the correct name, is an Error, and preserves provider with default message', () => {
    const e = new LlmKeyInvalid('openai');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LlmKeyInvalid);
    expect(e.name).toBe('LlmKeyInvalid');
    expect(e.provider).toBe('openai');
    expect(e.message).toBe('Invalid key for openai');
  });

  it('uses custom message when provided', () => {
    const e = new LlmKeyInvalid('anthropic', 'Custom error message');
    expect(e.message).toBe('Custom error message');
    expect(e.provider).toBe('anthropic');
  });
});

describe('LlmRateLimited', () => {
  it('has the correct name, is an Error, and preserves retryAfterMs', () => {
    const e = new LlmRateLimited(5000);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LlmRateLimited);
    expect(e.name).toBe('LlmRateLimited');
    expect(e.retryAfterMs).toBe(5000);
    expect(e.message).toBe('Rate limited');
  });

  it('handles undefined retryAfterMs', () => {
    const e = new LlmRateLimited();
    expect(e.retryAfterMs).toBeUndefined();
    expect(e.message).toBe('Rate limited');
  });
});

describe('LlmUnavailable', () => {
  it('has the correct name, is an Error, and preserves httpStatus with default message', () => {
    const e = new LlmUnavailable(503);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LlmUnavailable);
    expect(e.name).toBe('LlmUnavailable');
    expect(e.httpStatus).toBe(503);
    expect(e.message).toBe('LLM unavailable');
  });

  it('uses custom message when provided', () => {
    const e = new LlmUnavailable(502, 'Bad gateway');
    expect(e.httpStatus).toBe(502);
    expect(e.message).toBe('Bad gateway');
  });

  it('handles undefined httpStatus', () => {
    const e = new LlmUnavailable();
    expect(e.httpStatus).toBeUndefined();
    expect(e.message).toBe('LLM unavailable');
  });
});

describe('LlmSchemaError', () => {
  it('has the correct name, is an Error, and preserves zodIssues and lastResponse', () => {
    const zodIssues = { path: ['field'], message: 'Invalid' };
    const lastResponse = { text: 'invalid response' };
    const e = new LlmSchemaError(zodIssues, lastResponse);

    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LlmSchemaError);
    expect(e.name).toBe('LlmSchemaError');
    expect(e.zodIssues).toEqual(zodIssues);
    expect(e.lastResponse).toEqual(lastResponse);
    expect(e.message).toBe('Schema validation failed after retries');
  });
});

describe('LlmTimeout', () => {
  it('has the correct name, is an Error, and preserves timeoutMs with formatted message', () => {
    const e = new LlmTimeout(30000);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LlmTimeout);
    expect(e.name).toBe('LlmTimeout');
    expect(e.timeoutMs).toBe(30000);
    expect(e.message).toBe('Timed out after 30000ms');
  });
});
