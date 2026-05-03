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
  // Phase 2+ adds rows here as features ship.
];

export function findRoute(taskId: string): RouteConfig | undefined {
  return ROUTING.find((r) => r.taskId === taskId);
}
