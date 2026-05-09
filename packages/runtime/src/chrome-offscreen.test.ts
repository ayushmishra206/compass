import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withHeavyDocAlive } from './chrome-offscreen';

interface MockPort {
  disconnect: ReturnType<typeof vi.fn>;
}

function installChromeMock(): { port: MockPort; connect: ReturnType<typeof vi.fn> } {
  const port: MockPort = { disconnect: vi.fn() };
  const connect = vi.fn().mockReturnValue(port);
  // ensureHeavyDoc consumers
  const getContexts = vi.fn().mockResolvedValue([{ contextType: 'OFFSCREEN_DOCUMENT' }]);
  const createDocument = vi.fn().mockResolvedValue(undefined);
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { connect, getContexts },
    offscreen: { createDocument },
  };
  return { port, connect };
}

describe('withHeavyDocAlive', () => {
  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('opens a keepalive port, runs the work, then disconnects the port', async () => {
    const { port, connect } = installChromeMock();
    const work = vi.fn().mockResolvedValue('done');

    const result = await withHeavyDocAlive(work);

    expect(result).toBe('done');
    expect(connect).toHaveBeenCalledWith({ name: 'heavy-doc-keepalive' });
    expect(work).toHaveBeenCalledTimes(1);
    expect(port.disconnect).toHaveBeenCalledTimes(1);
  });
});
