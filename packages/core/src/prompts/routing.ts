import type { ProviderId } from '../types/credentials';

export interface RouteConfig {
  taskId: string;
  models: Partial<Record<ProviderId, string>>;
  reasoningEffort: 'none' | 'low' | 'medium' | 'high';
  maxOutputTokens: number;
  cacheable: boolean;
  temperature?: number;
}

export const ROUTING: ReadonlyArray<RouteConfig> = [
  {
    taskId: 'system.ping',
    models: {
      openrouter: 'anthropic/claude-haiku-4-5',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-haiku-4-5',
    },
    reasoningEffort: 'none',
    maxOutputTokens: 50,
    cacheable: false,
  },
  {
    taskId: 'brief.morning',
    models: {
      openrouter: 'anthropic/claude-sonnet-4-6',
      openai: 'gpt-5.4-mini',
      anthropic: 'claude-sonnet-4-6',
    },
    reasoningEffort: 'low',
    maxOutputTokens: 800,
    cacheable: true,
    temperature: 0.4,
  },
  {
    taskId: 'brief.eod',
    models: {
      openrouter: 'anthropic/claude-sonnet-4-6',
      openai: 'gpt-5.4-mini',
      anthropic: 'claude-sonnet-4-6',
    },
    reasoningEffort: 'low',
    maxOutputTokens: 600,
    cacheable: true,
    temperature: 0.5,
  },
  // Phase 2+ adds rows here as features ship.
];

export function findRoute(taskId: string): RouteConfig | undefined {
  return ROUTING.find((r) => r.taskId === taskId);
}
