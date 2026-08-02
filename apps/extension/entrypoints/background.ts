import { createHandlerRegistry, ensureHeavyDoc, installRequestListener } from '@compass/runtime';
import { ensureAlarms, registerAlarmHandlers } from '@compass/integrations';
import { clearOAuthGrant } from '@compass/core';
import { connectGoogleCalendar, connectGoogleInbox } from './sw/calendarAuth';
import { applyBlockRules, grantPass } from './sw/blockRules';

/**
 * Routes the service worker owns outright. Everything else is forwarded to the
 * offscreen document. These are here because they need extension APIs the
 * offscreen document cannot reach (identity, alarms).
 */
const swRegistry = createHandlerRegistry();

swRegistry.register('alarms.refresh', async () => {
  await ensureAlarms();
  return { ok: true } as const;
});

swRegistry.register('calendar.connect', async ({ clientId }) => {
  const res = await connectGoogleCalendar(clientId);
  return res.ok
    ? ({ ok: true, email: res.email } as const)
    : ({ ok: false, error: res.error ?? 'Connection failed.' } as const);
});

swRegistry.register('blocker.applyRules', async ({ rules, focusActive }) => {
  const active = await applyBlockRules(rules, {
    focusActive,
    blockPageUrl: chrome.runtime.getURL('blocked.html'),
  });
  return { ok: true as const, active };
});

swRegistry.register('blocker.grantPass', async ({ hostname }) => {
  await grantPass(hostname);
  return { ok: true as const };
});

swRegistry.register('inbox.connect', async ({ clientId }) => {
  const res = await connectGoogleInbox(clientId);
  return res.ok
    ? ({ ok: true, email: res.email } as const)
    : ({ ok: false, error: res.error ?? 'Connection failed.' } as const);
});

swRegistry.register('calendar.disconnect', async () => {
  await clearOAuthGrant('google');
  return { ok: true } as const;
});

export default defineBackground(() => {
  console.log('Compass service worker online');

  // Answers the routes above. Ownership is checked inside, so this listener and
  // the offscreen document's can coexist without racing.
  installRequestListener(swRegistry);

  chrome.runtime.onMessage.addListener((msg: unknown) => {
    const m = msg as { kind?: string; routeKind?: string } | null;
    if (m?.kind !== 'rpc.request') return false;
    // SW-owned routes are already handled by the listener above; anything else
    // needs the heavy document awake to answer.
    if (m.routeKind && swRegistry.has(m.routeKind as never)) return false;
    void ensureHeavyDoc();
    // Do not call sendResponse — offscreen replies via its own sendMessage.
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
