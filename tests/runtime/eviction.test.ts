import { describe, it, expect, vi } from 'vitest';
import { rpc, __resetForTests } from '@compass/runtime/rpc';

describe('rpc eviction safety', () => {
  it('correlates response by id even when multiple in flight', async () => {
    __resetForTests();
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    const listeners: Array<(msg: unknown) => void> = [];
    let nextId = 0;
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage,
        onMessage: { addListener: (fn: (msg: unknown) => void) => listeners.push(fn) },
      },
    });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `id-${++nextId}`),
    });

    const a = rpc('system.ping', { utterance: 'a' });
    const b = rpc('system.ping', { utterance: 'b' });

    // Reply out of order
    listeners[0]!({ kind: 'rpc.response', requestId: 'id-2', result: { pong: true, echo: 'b' } });
    listeners[0]!({ kind: 'rpc.response', requestId: 'id-1', result: { pong: true, echo: 'a' } });

    expect(await a).toEqual({ pong: true, echo: 'a' });
    expect(await b).toEqual({ pong: true, echo: 'b' });
  });
});
