import { useEffect } from 'react';
import { useBrief } from '../hooks/useBrief';
import { BriefTLDR } from './brief/BriefTLDR';
import { PomodorosSection } from './brief/PomodorosSection';
import { WatchoutsSection } from './brief/WatchoutsSection';
import { RecoverySection } from './brief/RecoverySection';
import { QuotedGoalSection } from './brief/QuotedGoalSection';
import { BriefFooter } from './brief/BriefFooter';
import { LockedEmpty } from './brief/LockedEmpty';
import { TooEarlyEmpty } from './brief/TooEarlyEmpty';
import { ErrorEmpty } from './brief/ErrorEmpty';

interface BriefingOutput {
  oneLineMood?: string;
  tldr: string;
  topPriority?: { title: string; why: string; suggestedFocusMinutes: number };
  pomodoros?: Array<{ startLocal: string; endLocal: string; theme: string; taskId?: string }>;
  watchouts?: string[];
  recovery?: { note: string; suggestBreak: boolean };
  quotedGoal?: string | null;
}

export function BriefDrawer() {
  const { state, regenerate, recordOpen, recordRating } = useBrief('morning');

  useEffect(() => {
    if (state.kind === 'have-brief' && state.brief.openedAt === null) {
      void recordOpen();
    }
  }, [state, recordOpen]);

  if (state.kind === 'loading') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-ink-3)' }}>Loading…</div>
    );
  }

  if (state.kind === 'too-early') {
    return <TooEarlyEmpty readyAt={state.readyAt} />;
  }

  if (state.kind === 'locked-no-brief') {
    return <LockedEmpty />;
  }

  if (state.kind === 'error') {
    return <ErrorEmpty message={state.message} onRetry={regenerate} />;
  }

  // 'have-brief'
  const o = state.brief.output as BriefingOutput;
  return (
    <>
      <BriefTLDR text={o.tldr} mood={o.oneLineMood} />
      <PomodorosSection items={o.pomodoros} />
      <WatchoutsSection items={o.watchouts} />
      <RecoverySection note={o.recovery ?? null} />
      <QuotedGoalSection goal={o.quotedGoal ?? null} />
      <BriefFooter
        provider={state.brief.providerUsed}
        cost={state.brief.costUsd}
        rating={state.brief.userRating}
        onRate={(r) => void recordRating(r)}
        onRegenerate={() => void regenerate()}
      />
    </>
  );
}
