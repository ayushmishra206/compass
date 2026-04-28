import { rpc } from '@compass/runtime';

export type Provider = 'openrouter';
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Phase 1: validates LLM key via RPC call to offscreen llm.validateKey handler.
 * Narrowed to 'openrouter' provider; direct providers (openai, anthropic) deferred to v0.2.
 */
export async function validateLlmKey(
  provider: Provider,
  apiKey: string,
): Promise<ValidationResult> {
  return rpc('llm.validateKey', { provider, apiKey });
}
