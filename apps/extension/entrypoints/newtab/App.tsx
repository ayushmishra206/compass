import { Route, Switch } from 'wouter';
import { AppShell, ThemeProvider } from '@compass/ui';
import { useShell } from '@app/state/shell.js';
import { useGlobalShortcuts } from '@app/shortcuts.js';
import { CompassSidebar } from '@app/components/CompassSidebar.js';
import { CompassTopbar } from '@app/components/CompassTopbar.js';
import { TweaksPanel } from '@app/components/TweaksPanel.js';
import { NewTab } from '@app/routes/newtab/index.js';
import { Notes } from '@app/routes/notes/index.js';
import { Focus, FocusRunning } from '@app/routes/focus/index.js';
import { Goals } from '@app/routes/goals/index.js';
import { Inbox } from '@app/routes/inbox/index.js';
import { Blocker, BlockOverlay } from '@app/routes/blocker/index.js';
import { Settings } from '@app/routes/settings/index.js';
import { Onboarding } from '@app/routes/onboarding/index.js';

export function App() {
  const { theme, accent, density, overlay, overlayPayload, closeOverlay } = useShell();
  useGlobalShortcuts();

  return (
    <ThemeProvider theme={theme} accent={accent} density={density}>
      <AppShell density={density} sidebar={<CompassSidebar />}>
        <CompassTopbar />
        <Switch>
          <Route path="/" component={NewTab} />
          <Route path="/notes" component={Notes} />
          <Route path="/notes/:id" component={Notes} />
          <Route path="/focus" component={Focus} />
          <Route path="/goals" component={Goals} />
          <Route path="/goals/:id" component={Goals} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/inbox/:id" component={Inbox} />
          <Route path="/blocker" component={Blocker} />
          <Route path="/settings" component={Settings} />
        </Switch>
      </AppShell>

      <TweaksPanel />
      {overlay === 'focusRunning' && (
        <FocusRunning payload={overlayPayload} onClose={closeOverlay} />
      )}
      {overlay === 'blockOverlay' && (
        <BlockOverlay payload={overlayPayload} onClose={closeOverlay} />
      )}
      {overlay === 'onboarding' && <Onboarding onClose={closeOverlay} />}
    </ThemeProvider>
  );
}
