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
let wakeupPromise: Promise<void> | null = null;

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

/**
 * One-shot handshake with the SW. Returns when the offscreen document is alive
 * and its rpc handlers are registered. Subsequent rpcs can broadcast safely.
 *
 * Without this, the very first rpc on a cold extension start can be lost: the
 * SW receives the broadcast and triggers ensureHeavyDoc(), but the offscreen
 * doc isn't listening yet when our message arrives, and chrome.runtime
 * messaging has no replay buffer. Callers would see hung Promises and the new
 * tab would render blank Stage / brief / etc. until a manual reload.
 */
function ensureHeavyDocReady(): Promise<void> {
  if (wakeupPromise) return wakeupPromise;
  wakeupPromise = new Promise<void>((resolve) => {
    const tryWakeup = (attempt: number): void => {
      chrome.runtime
        .sendMessage({ kind: 'heavy.wakeup' })
        .then((res: unknown) => {
          if (res && typeof res === 'object' && (res as { ready?: boolean }).ready) {
            resolve();
            return;
          }
          if (attempt < 4) setTimeout(() => tryWakeup(attempt + 1), 250);
          else resolve(); // give up; let the rpc itself try and surface its own error
        })
        .catch(() => {
          if (attempt < 4) setTimeout(() => tryWakeup(attempt + 1), 250);
          else resolve();
        });
    };
    tryWakeup(0);
  });
  return wakeupPromise;
}

export async function rpc<K extends keyof Routes>(
  kind: K,
  payload: Routes[K]['req'],
): Promise<Routes[K]['res']> {
  installListener();
  await ensureHeavyDocReady();
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
  wakeupPromise = null;
}
