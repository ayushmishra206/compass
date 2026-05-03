import type { Routes } from './routes';

export interface HeavyRuntime {
  /** Resolves once the runtime is ready to dispatch handlers. Idempotent. */
  init(): Promise<void>;

  /** Send a one-shot RPC; resolves with the typed response. */
  rpc<K extends keyof Routes>(kind: K, payload: Routes[K]['req']): Promise<Routes[K]['res']>;

  /** Tear down (best-effort). Implementations may be no-ops. */
  shutdown(): Promise<void>;
}

export interface RpcHandler<K extends keyof Routes> {
  (payload: Routes[K]['req']): Promise<Routes[K]['res']>;
}

export interface HandlerRegistry {
  register<K extends keyof Routes>(kind: K, handler: RpcHandler<K>): void;
  unregister(kind: keyof Routes): void;
  dispatch<K extends keyof Routes>(kind: K, payload: Routes[K]['req']): Promise<Routes[K]['res']>;
}
