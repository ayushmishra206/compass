import type { ProviderId } from '@compass/core';
import { rpc } from '@compass/runtime';

export type Provider = ProviderId;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an LLM API key for the given provider via RPC to the offscreen
 * llm.validateKey handler. Phase 1.5: supports openrouter, openai, anthropic.
 */
export async function validateLlmKey(
  provider: Provider,
  apiKey: string,
): Promise<ValidationResult> {
  return rpc('llm.validateKey', { provider, apiKey });
}
