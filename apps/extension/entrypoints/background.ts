import { ensureHeavyDoc } from '@compass/runtime';
import { ensureAlarms, registerAlarmHandlers } from '@compass/integrations';

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

  // Phase 1.5 alarms: register the listener once, then reconcile alarms.
  // Reconcile runs at top level (covers Chrome SW wake, FF persistent page reload,
  // Safari SW wake) and again on install/startup events when present.
  registerAlarmHandlers();
  void ensureAlarms();

  chrome.runtime.onInstalled.addListener(() => {
    void ensureAlarms();
  });
  if (chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(() => {
      void ensureAlarms();
    });
  }
});
