import type { CSSProperties } from 'react';
import { OverlayText, Pill, Stack } from '@compass/ui';
import { useShell } from '../state/shell.js';
import { useBrief } from '../hooks/useBrief.js';
import { formatFocusTime, formatHour, useFocusSignals } from '../hooks/useFocusSignals.js';

interface BriefingOutput {
  watchouts?: string[];
  quotedGoal?: string | null;
}

const tickerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  gap: 28,
  padding: '14px 56px',
  zIndex: 8,
  position: 'relative',
  animationDelay: '240ms',
};

const vitalsStyle: CSSProperties = { display: 'flex', gap: 28 };
const rightStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  justifyContent: 'flex-end',
  alignItems: 'center',
};

const dotWarnStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'oklch(0.7 0.16 30)',
};

interface VitalProps {
  label: string;
  value: number | string;
  sub: string;
}

function Vital({ label, value, sub }: VitalProps) {
  return (
    <Stack gap={1}>
      <OverlayText variant="mono" tone="muted" style={{ fontSize: 10, letterSpacing: '0.16em' }}>
        {label}
      </OverlayText>
      <OverlayText
        variant="title"
        as="span"
        style={{ fontSize: 22, fontWeight: 400, lineHeight: 1 }}
      >
        {value}
      </OverlayText>
      <OverlayText
        variant="mono"
        tone="secondary"
        style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'none' as const }}
      >
        {sub}
      </OverlayText>
    </Stack>
  );
}

export function Ticker() {
  const navClick = useShell((s) => s.navClick);
  const { state } = useBrief('morning');
  const signals = useFocusSignals();

  const output = state.kind === 'have-brief' ? (state.brief.output as BriefingOutput) : null;
  const watchouts = output?.watchouts ?? [];
  const quotedGoal = output?.quotedGoal ?? null;

  // Vitals are drawn from focus history, which Compass actually measures.
  // Sleep / recovery / RHR were mock Fitbit numbers with no integration behind
  // them — a dashboard that invents biometrics is worse than one that omits
  // them, so they are gone rather than faked.
  const peak = formatHour(signals.peakFocusHour);

  return (
    <div style={tickerStyle} className="compass-slideup">
      <div style={vitalsStyle}>
        {signals.streakDays > 0 && (
          <Vital
            label="Streak"
            value={signals.streakDays}
            sub={signals.streakDays === 1 ? 'day' : 'days'}
          />
        )}
        {signals.totalFocusMin > 0 && (
          <Vital label="Focus" value={formatFocusTime(signals.totalFocusMin)} sub="last 30d" />
        )}
        {peak && <Vital label="Peak" value={peak} sub="best hour" />}
      </div>
      {quotedGoal && (
        <OverlayText
          variant="serif-body"
          italic
          tone="secondary"
          style={{ fontSize: 14, textAlign: 'center', maxWidth: 480 }}
        >
          &quot;{quotedGoal}&quot;
        </OverlayText>
      )}
      <div style={rightStyle}>
        {watchouts.map((w, i) => (
          <Pill
            key={i}
            size="md"
            tone="warn"
            onClick={() => navClick('today')}
            leading={<span style={dotWarnStyle} />}
          >
            {w}
          </Pill>
        ))}
      </div>
    </div>
  );
}
