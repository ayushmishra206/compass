import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
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
  borderTop: '1px solid var(--color-hair)',
  background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4))',
  zIndex: 8,
  position: 'relative',
};
const vitalsStyle: CSSProperties = { display: 'flex', gap: 28 };
const vitalStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const lblStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '0.16em',
  color: 'var(--color-ink-4)',
};
const valStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 20,
  fontWeight: 400,
  lineHeight: 1,
  letterSpacing: '-0.02em',
};
const subStyle: CSSProperties = {
  fontSize: 10,
  color: 'var(--color-ink-3)',
  fontFamily: 'var(--font-mono)',
};
const centerStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontStyle: 'italic',
  fontSize: 14,
  color: 'var(--color-ink-2)',
  textAlign: 'center',
  maxWidth: 480,
};
const rightStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  justifyContent: 'flex-end',
  alignItems: 'center',
};
const pillStyle: CSSProperties = {
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--color-ink-2)',
  cursor: 'pointer',
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
    <div style={tickerStyle}>
      <div style={vitalsStyle}>
        <div style={vitalStyle}>
          <span style={lblStyle}>Sleep</span>
          <span style={valStyle}>{v.sleep}</span>
          <span style={subStyle}>good</span>
        </div>
        <div style={vitalStyle}>
          <span style={lblStyle}>Recovery</span>
          <span style={valStyle}>{v.recovery}</span>
          <span style={subStyle}>mid</span>
        </div>
        <div style={vitalStyle}>
          <span style={lblStyle}>RHR</span>
          <span style={valStyle}>{v.rhr}</span>
          <span style={subStyle}>bpm</span>
        </div>
        {streak.days > 0 && (
          <div style={vitalStyle}>
            <span style={lblStyle}>Streak</span>
            <span style={valStyle}>{streak.days}</span>
            <span style={subStyle}>days</span>
          </div>
        )}
      </div>
      <div style={centerStyle}>&quot;{MOCK.brief.quotedGoal}&quot;</div>
      <div style={rightStyle}>
        <button style={pillStyle} onClick={() => navClick('inbox')}>
          <span style={dotStyle} />2 inbox actions
        </button>
        {watchouts.map((w, i) => (
          <button key={i} style={pillStyle} onClick={() => navClick('today')}>
            <span style={dotWarnStyle} />
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
