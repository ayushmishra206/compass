import { describe, it, expect, vi } from 'vitest';
import { createHandlerRegistry, installRequestListener } from '../src/handler';

describe('handler registry', () => {
  it('dispatches request to registered handler and replies with result', async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage,
        onMessage: { addListener: vi.fn() },
      },
    });

    const registry = createHandlerRegistry();
    registry.register('system.ping', async ({ utterance }) => ({
      pong: true as const,
      echo: utterance,
    }));

    installRequestListener(registry);
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]![0] as (
      msg: unknown,
    ) => boolean;
    const handled = listener({
      kind: 'rpc.request',
      routeKind: 'system.ping',
      requestId: 'req-1',
      payload: { utterance: 'hi' },
    });
    expect(handled).toBe(true);

    await new Promise((r) => setTimeout(r, 0));

    expect(sendMessage).toHaveBeenCalledWith({
      kind: 'rpc.response',
      requestId: 'req-1',
      result: { pong: true, echo: 'hi' },
    });
  });

  it('replies with error envelope when handler throws', async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: { sendMessage, onMessage: { addListener: vi.fn() } },
    });

    const registry = createHandlerRegistry();
    registry.register('system.ping', async () => {
      throw new Error('boom');
    });

    installRequestListener(registry);
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]![0] as (
      msg: unknown,
    ) => boolean;
    listener({
      kind: 'rpc.request',
      routeKind: 'system.ping',
      requestId: 'req-2',
      payload: { utterance: 'x' },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(sendMessage).toHaveBeenCalledWith({
      kind: 'rpc.response',
      requestId: 'req-2',
      error: { name: 'Error', message: 'boom' },
    });
  });
});
