import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { OverlayText, Pill, Stack } from '@compass/ui';
import { rpc } from '@compass/runtime';
import { useShell } from '../state/shell.js';
import { useBrief } from '../hooks/useBrief.js';
import { MOCK } from '../mocks/index.js';

interface BriefingOutput {
  watchouts?: string[];
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

const dotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'var(--accent)',
};
const dotWarnStyle: CSSProperties = {
  ...dotStyle,
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
  const v = MOCK.vitals;
  const { state } = useBrief('morning');
  const [streak, setStreak] = useState<{ days: number; lastDate: string | null }>({
    days: 0,
    lastDate: null,
  });

  useEffect(() => {
    void rpc('brief.streak', {}).then(setStreak);
  }, []);

  const watchouts =
    state.kind === 'have-brief' ? ((state.brief.output as BriefingOutput).watchouts ?? []) : [];

  return (
    <div style={tickerStyle} className="compass-slideup">
      <div style={vitalsStyle}>
        <Vital label="Sleep" value={v.sleep} sub="good" />
        <Vital label="Recovery" value={v.recovery} sub="mid" />
        <Vital label="RHR" value={v.rhr} sub="bpm" />
        {streak.days > 0 && <Vital label="Streak" value={streak.days} sub="days" />}
      </div>
      <OverlayText
        variant="serif-body"
        italic
        tone="secondary"
        style={{ fontSize: 14, textAlign: 'center', maxWidth: 480 }}
      >
        &quot;{MOCK.brief.quotedGoal}&quot;
      </OverlayText>
      <div style={rightStyle}>
        <Pill size="md" onClick={() => navClick('inbox')} leading={<span style={dotStyle} />}>
          2 inbox actions
        </Pill>
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
