import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rpc, __resetForTests } from '../src/rpc';

describe('rpc', () => {
  beforeEach(() => {
    __resetForTests();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-id-1'),
    });
  });

  it('correlates response by request id', async () => {
    const sendMessage = vi.mocked(chrome.runtime.sendMessage);
    const addListener = vi.mocked(chrome.runtime.onMessage.addListener);

    sendMessage.mockResolvedValue({ ok: true });

    const promise = rpc('system.ping', { utterance: 'hi' });

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

    const listener = addListener.mock.calls[0]![0] as (msg: unknown) => void;
    listener({
      kind: 'rpc.response',
      requestId: 'test-id-1',
      error: { name: 'BadInput', message: 'nope' },
    });

    await expect(promise).rejects.toThrow('nope');
  });
});
