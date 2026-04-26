import type { Routes } from './routes';

interface RpcResponseEnvelope {
  kind: 'rpc.response';
  requestId: string;
  result?: unknown;
  error?: { name: string; message: string };
}

interface RpcRequestEnvelope<K extends keyof Routes> {
  kind: 'rpc.request';
  routeKind: K;
  requestId: string;
  payload: Routes[K]['req'];
}

const pending = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }
>();

let listenerInstalled = false;

function installListener(): void {
  if (listenerInstalled) return;
  listenerInstalled = true;
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if (!msg || typeof msg !== 'object' || (msg as { kind?: string }).kind !== 'rpc.response') {
      return;
    }
    const envelope = msg as RpcResponseEnvelope;
    const entry = pending.get(envelope.requestId);
    if (!entry) return;
    pending.delete(envelope.requestId);
    if (envelope.error) {
      const err = new Error(envelope.error.message);
      err.name = envelope.error.name;
      entry.reject(err);
    } else {
      entry.resolve(envelope.result);
    }
  });
}

export async function rpc<K extends keyof Routes>(
  kind: K,
  payload: Routes[K]['req'],
): Promise<Routes[K]['res']> {
  installListener();
  const requestId = crypto.randomUUID();
  const envelope: RpcRequestEnvelope<K> = {
    kind: 'rpc.request',
    routeKind: kind,
    requestId,
    payload,
  };

  return new Promise<Routes[K]['res']>((resolve, reject) => {
    pending.set(requestId, {
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    chrome.runtime.sendMessage(envelope).catch((err) => {
      pending.delete(requestId);
      reject(err);
    });
  });
}

// Test-only: clear pending state between tests.
export function __resetForTests(): void {
  pending.clear();
  listenerInstalled = false;
}
