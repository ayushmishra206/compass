import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rpc, __resetForTests } from '../src/rpc';

// Returns a sendMessage mock that handshakes the heavy.wakeup probe immediately
// (so tests don't pay the 1s back-off) and forwards rpc.request through to a
// caller-provided handler. Pass an `onRpcRequest` to assert on outgoing rpcs.
function mockSendMessage(onRpcRequest?: (msg: unknown) => unknown) {
  return vi.fn(async (msg: unknown) => {
    if (msg && typeof msg === 'object' && (msg as { kind?: string }).kind === 'heavy.wakeup') {
      return { ready: true as const };
    }
    return onRpcRequest ? onRpcRequest(msg) : undefined;
  });
}

describe('rpc', () => {
  beforeEach(() => {
    __resetForTests();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: mockSendMessage(),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-id-1'),
    });
  });

  it('correlates response by request id', async () => {
    const addListener = vi.mocked(chrome.runtime.onMessage.addListener);

    const promise = rpc('system.ping', { utterance: 'hi' });

    // Drain microtasks so ensureHeavyDocReady completes and the rpc.request
    // sendMessage call registers its pending entry before we fire the response.
    await Promise.resolve();
    await Promise.resolve();

    const listener = addListener.mock.calls[0]![0] as (msg: unknown) => void;
    listener({
      kind: 'rpc.response',
      requestId: 'test-id-1',
      result: { pong: true, echo: 'hi' },
    });

    await expect(promise).resolves.toEqual({ pong: true, echo: 'hi' });
  });

  it('rejects on error response', async () => {
    const addListener = vi.mocked(chrome.runtime.onMessage.addListener);

    const promise = rpc('system.ping', { utterance: 'hi' });

    await Promise.resolve();
    await Promise.resolve();

    const listener = addListener.mock.calls[0]![0] as (msg: unknown) => void;
    listener({
      kind: 'rpc.response',
      requestId: 'test-id-1',
      error: { name: 'BadInput', message: 'nope' },
    });

    await expect(promise).rejects.toThrow('nope');
  });
});
