import { describe, it, expect } from 'vitest';
import { LlmCredentialsSchema, KeyEntrySchema } from './credentials';

describe('LlmCredentials schema', () => {
  it('accepts a Phase-1 OpenRouter-only credential set', () => {
    const result = LlmCredentialsSchema.safeParse({
      default: 'openrouter',
      openrouter: { apiKey: 'sk-or-v1-abc', addedAt: '2026-04-26T10:00:00Z' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts the skipped state', () => {
    expect(LlmCredentialsSchema.safeParse({ default: null }).success).toBe(true);
  });

  it('rejects a key entry without addedAt', () => {
    const result = KeyEntrySchema.safeParse({ apiKey: 'x' });
    expect(result.success).toBe(false);
  });
});
