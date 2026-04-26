import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureHeavyDoc } from '../src/chrome-offscreen';

describe('ensureHeavyDoc', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { getContexts: vi.fn() },
      offscreen: {
        createDocument: vi.fn(),
        Reason: { BLOBS: 'BLOBS', IFRAME_SCRIPTING: 'IFRAME_SCRIPTING' },
      },
    });
  });

  it('creates the offscreen document if none exists', async () => {
    vi.mocked(chrome.runtime.getContexts).mockResolvedValue([]);
    vi.mocked(chrome.offscreen.createDocument).mockResolvedValue(undefined);

    await ensureHeavyDoc();

    expect(chrome.offscreen.createDocument).toHaveBeenCalledWith({
      url: '/offscreen.html',
      reasons: ['BLOBS', 'IFRAME_SCRIPTING'],
      justification: 'sqlite-wasm DB, embeddings runtime, LLM fetch',
    });
  });

  it('skips creation when offscreen already exists', async () => {
    vi.mocked(chrome.runtime.getContexts).mockResolvedValue([
      { contextType: 'OFFSCREEN_DOCUMENT' },
    ] as unknown as chrome.runtime.ExtensionContext[]);

    await ensureHeavyDoc();

    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
  });

  it('coalesces concurrent calls', async () => {
    vi.mocked(chrome.runtime.getContexts).mockResolvedValue([]);
    vi.mocked(chrome.offscreen.createDocument).mockImplementation(
      () => new Promise((r) => setTimeout(r, 10)),
    );

    await Promise.all([ensureHeavyDoc(), ensureHeavyDoc(), ensureHeavyDoc()]);

    expect(chrome.offscreen.createDocument).toHaveBeenCalledTimes(1);
  });
});
