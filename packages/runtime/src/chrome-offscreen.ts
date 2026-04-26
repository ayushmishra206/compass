let creating: Promise<void> | null = null;

const OFFSCREEN_URL = '/offscreen.html';
const REASONS = ['BLOBS', 'IFRAME_SCRIPTING'] as const as chrome.offscreen.Reason[];
const JUSTIFICATION = 'sqlite-wasm DB, embeddings runtime, LLM fetch';

export async function ensureHeavyDoc(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'] as const as chrome.runtime.ContextType[],
  });
  if (existing.length > 0) return;

  if (!creating) {
    creating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: REASONS,
        justification: JUSTIFICATION,
      })
      .finally(() => {
        creating = null;
      });
  }
  await creating;
}
