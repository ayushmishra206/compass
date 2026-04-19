import { delay } from './_util.js';

export type Provider = 'openai' | 'anthropic' | 'openrouter';
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Stub: returns `valid: true` for any plausible-looking key after ~900 ms.
 * Phase 1 replaces with a real `GET /v1/models` (OpenAI) or equivalent.
 */
export async function validateLlmKey(_provider: Provider, key: string): Promise<ValidationResult> {
  await delay(900);
  if (!key || key.length < 4) return { valid: false, error: 'invalid_api_key' };
  return { valid: true };
}
