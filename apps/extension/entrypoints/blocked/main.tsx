import { createRoot } from 'react-dom/client';
import '@compass/ui/theme.css';
import '@compass/ui/fonts';
import { rpc } from '@compass/runtime';
import { BlockedPage } from './BlockedPage';

const params = new URLSearchParams(location.search);
const host = params.get('host') ?? 'This site';
const mode = params.get('mode') === 'hard' ? 'hard' : 'soft';
const ruleId = params.get('rule');

function goBack() {
  // history.back() would land on the blocked URL again if it was the first
  // navigation in this tab, so fall back to the new tab page.
  if (history.length > 1) history.back();
  else location.href = chrome.runtime.getURL('newtab.html');
}

async function bypass(reason: string) {
  if (ruleId) {
    // The reason stays on-device; only the outcome is recorded.
    void reason;
    await rpc('blocker.recordBypass', { ruleId, hostname: host }).catch(() => {});
  }
  // Re-navigating would hit the same DNR rule, so ask the SW to let this tab
  // through once before going.
  await rpc('blocker.grantPass', { hostname: host }).catch(() => {});
  location.href = `https://${host}`;
}

createRoot(document.getElementById('root')!).render(
  <BlockedPage host={host} mode={mode} onBack={goBack} onBypass={(r) => void bypass(r)} />,
);
