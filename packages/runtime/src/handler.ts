import type { HandlerRegistry, RpcHandler } from './HeavyRuntime';
import type { Routes } from './routes';

export function createHandlerRegistry(): HandlerRegistry {
  const handlers = new Map<keyof Routes, RpcHandler<keyof Routes>>();
  return {
    register(kind, handler) {
      handlers.set(kind, handler as unknown as RpcHandler<keyof Routes>);
    },
    unregister(kind) {
      handlers.delete(kind);
    },
    dispatch: async (kind, payload) => {
      const handler = handlers.get(kind);
      if (!handler) throw new Error(`No handler for route '${String(kind)}'`);
      return handler(payload);
    },
  };
}

interface RpcRequestEnvelope {
  kind: 'rpc.request';
  routeKind: keyof Routes;
  requestId: string;
  payload: unknown;
}

export function installRequestListener(registry: HandlerRegistry): void {
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if (!msg || typeof msg !== 'object' || (msg as { kind?: string }).kind !== 'rpc.request') {
      return false;
    }
    const env = msg as RpcRequestEnvelope;
    void registry
      .dispatch(env.routeKind, env.payload as Routes[keyof Routes]['req'])
      .then((result) => {
        chrome.runtime.sendMessage({
          kind: 'rpc.response',
          requestId: env.requestId,
          result,
        });
      })
      .catch((err: unknown) => {
        const e = err as Error;
        chrome.runtime.sendMessage({
          kind: 'rpc.response',
          requestId: env.requestId,
          error: { name: e.name ?? 'Error', message: e.message ?? String(err) },
        });
      });
    return true;
  });
}
