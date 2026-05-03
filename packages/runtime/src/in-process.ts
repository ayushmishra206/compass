import type { HeavyRuntime } from './HeavyRuntime';
import type { Routes } from './routes';
import { createHandlerRegistry } from './handler';

export interface InProcessRuntime extends HeavyRuntime {
  readonly registry: ReturnType<typeof createHandlerRegistry>;
}

export function createInProcessRuntime(): InProcessRuntime {
  const registry = createHandlerRegistry();
  let initialized = false;
  return {
    registry,
    async init() {
      initialized = true;
    },
    async rpc<K extends keyof Routes>(kind: K, payload: Routes[K]['req']) {
      if (!initialized) throw new Error('Runtime not initialized');
      return registry.dispatch(kind, payload);
    },
    async shutdown() {
      initialized = false;
    },
  };
}
