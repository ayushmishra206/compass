import { ensureHeavyDoc } from '@compass/runtime';
import { ensureAlarms, registerAlarmHandlers } from '@compass/integrations';

export default defineBackground(() => {
  console.log('Compass service worker online');

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    // Cold-start handshake. The new tab fires this before any rpc so it can
    // await offscreen creation; otherwise rpc.request broadcasts can arrive
    // before the offscreen handler is registered and silently disappear,
    // leaving Stage / brief / etc. blank until manual reload.
    if (msg?.kind === 'heavy.wakeup') {
      void ensureHeavyDoc().then(() => sendResponse({ ready: true as const }));
      return true; // async response
    }
    if (msg?.kind === 'rpc.request' && msg?.route === 'alarms.refresh') {
      void ensureAlarms().then(() => sendResponse({ ok: true }));
      return true; // async response
    }
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
