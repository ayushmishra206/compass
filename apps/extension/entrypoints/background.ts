import { ensureHeavyDoc } from '@compass/runtime';

export default defineBackground(() => {
  console.log('Compass service worker online');

  chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
    if (msg?.kind === 'rpc.request') {
      void ensureHeavyDoc();
      // Do not call sendResponse — offscreen replies via its own sendMessage.
      return false;
    }
    return false;
  });
});
