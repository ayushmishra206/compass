import type { z } from 'zod';
import type { ProviderId } from '@compass/core';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  taskId: string;
  model: string;
  system?: string;
  messages: LlmMessage[];
  schema?: z.ZodTypeAny;
  maxOutputTokens: number;
  temperature?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  cacheable?: boolean;
  timeoutMs: number;
  trusted: boolean;
}

export interface LlmResponse {
  parsed?: unknown;
  text: string;
  usage: { promptTok: number; cachedTok: number; completionTok: number };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface LlmStreamEvent {
  type: 'delta' | 'done' | 'usage';
  data: unknown;
}

export interface LlmProvider {
  readonly id: ProviderId;
  complete(req: LlmRequest): Promise<LlmResponse>;
  stream(req: LlmRequest): AsyncIterable<LlmStreamEvent>;
  validateKey(apiKey: string): Promise<{ valid: boolean; error?: string }>;
}
