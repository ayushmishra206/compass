import { describe, it, expect } from 'vitest';
import { ConfigurationSchema } from './configuration';

describe('Configuration schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = ConfigurationSchema.safeParse({
      llmCredentials: {
        default: 'openrouter',
        openrouter: { apiKey: 'key', addedAt: '2026-04-26T10:00:00Z' },
      },
    });
    expect(ok.success).toBe(true);
  });

  it('accepts empty configuration', () => {
    expect(ConfigurationSchema.safeParse({}).success).toBe(true);
  });
});
