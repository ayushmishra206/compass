import { describe, expect, it } from 'vitest';
import { validateLlmKey } from './validateLlmKey.js';

describe('validateLlmKey stub', () => {
  it('valid for non-empty key', async () => {
    const r = await validateLlmKey('openai', 'sk-abcd');
    expect(r.valid).toBe(true);
  });

  it('invalid for short key', async () => {
    const r = await validateLlmKey('openai', 'sk');
    expect(r).toEqual({ valid: false, error: 'invalid_api_key' });
  });

  it('invalid for empty string', async () => {
    const r = await validateLlmKey('openai', '');
    expect(r).toEqual({ valid: false, error: 'invalid_api_key' });
  });
});
