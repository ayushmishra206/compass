import { describe, it, expect } from 'vitest';
import { createInProcessRuntime } from '@compass/runtime/in-process';

describe('runtime contract — in-process', () => {
  it('dispatches a registered route', async () => {
    const rt = createInProcessRuntime();
    rt.registry.register('system.ping', async ({ utterance }) => ({
      pong: true as const,
      echo: utterance,
    }));
    await rt.init();
    const res = await rt.rpc('system.ping', { utterance: 'hello' });
    expect(res).toEqual({ pong: true, echo: 'hello' });
  });

  it('rejects when route not registered', async () => {
    const rt = createInProcessRuntime();
    await rt.init();
    await expect(rt.rpc('system.ping', { utterance: 'x' })).rejects.toThrow(/No handler/);
  });
});
