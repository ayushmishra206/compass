import type { CSSProperties } from 'react';
import { GlassCard } from '@compass/ui';
import { useShell } from '../state/shell.js';
import { useScene } from '../scene/useScene.js';
import { MOCK } from '../mocks/index.js';
import { useBrief } from '../hooks/useBrief.js';

interface BriefingOutput {
  tldr: string;
  oneLineMood?: string;
}

const MOOD_TEXT: Record<string, string> = {
  dawn: 'Clear ridge, slow climb, low cloud.',
  fog: 'Quiet morning, soft edges, deep work weather.',
  ocean: 'Distance to cover, steady horizon, no obstacles.',
  alpine: 'High altitude, cold air, pace yourself.',
  desert: 'Long arc, warm light, single direction.',
};

const sectionStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 32,
  padding: '0 56px',
  alignItems: 'end',
  position: 'relative',
  zIndex: 5,
  overflow: 'hidden',
};
const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  paddingBottom: 8,
  maxWidth: 540,
};
// Hero text floats on the photo per the design reference — Stage's bottom
// scrim handles most contrast; these shadows are the safety net for bright photos.
const heroShadow = '0 2px 6px rgba(0,0,0,0.6), 0 0 24px rgba(0,0,0,0.4)';

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-2)',
  textShadow: heroShadow,
};
const greetingStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'clamp(48px, 7.2vw, 108px)',
  lineHeight: 0.95,
  letterSpacing: '-0.04em',
  fontWeight: 300,
  fontStyle: 'italic',
  margin: 0,
  color: 'var(--color-ink)',
  textShadow: heroShadow,
};
const whereStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 18,
  lineHeight: 1.5,
  color: 'var(--color-ink-2)',
  margin: 0,
  maxWidth: 480,
  textShadow: heroShadow,
};
const cardWrapStyle: CSSProperties = {
  padding: '24px 28px',
  marginBottom: 32,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 520,
  justifySelf: 'end',
  alignSelf: 'end',
  width: '100%',
};
const lblStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--accent-soft)',
};
const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 24,
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
  margin: 0,
  flex: 1,
  // Explicit so the h2 doesn't pick up any cascading accent color from the card.
  color: 'var(--color-ink)',
  fontWeight: 500,
};
const whyStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: 'var(--color-ink-2)',
  margin: 0,
  fontFamily: 'var(--font-serif)',
};
const actionsStyle: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' };
const btnAccent: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
};
const btnGhost: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
};

export function Hero() {
  const navClick = useShell((s) => s.navClick);
  const scene = useScene();
  const b = MOCK.brief;
  const { state } = useBrief('morning');

  let tldr = '';
  if (state.kind === 'have-brief') {
    tldr = (state.brief.output as BriefingOutput).tldr;
  } else if (state.kind === 'too-early') {
    const ready = new Date(state.readyAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    tldr = `Your morning brief will be ready at ${ready}.`;
  } else if (state.kind === 'locked-no-brief') {
    tldr = '🔒 Your daily brief is waiting. Unlock to generate.';
  }

  return (
    <section style={sectionStyle}>
      <div style={metaStyle}>
        <div style={monoStyle}>{stamp(new Date())}</div>
        <h1 style={greetingStyle}>
          Move with{' '}
          <em style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--accent-soft)' }}>
            momentum
          </em>
          .
        </h1>
        <p style={whereStyle}>
          {MOOD_TEXT[scene.mood] ?? ''} {tldr}
        </p>
      </div>
      <GlassCard tier={1} style={cardWrapStyle}>
        <div style={lblStyle}>Top of mind · 90 minutes</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <h2 style={titleStyle}>{b.topPriority.title}</h2>
        </div>
        <p style={whyStyle}>{b.topPriority.why}</p>
        <div style={actionsStyle}>
          <button style={btnAccent} onClick={() => navClick('focus')}>
            ▶ Begin 90 min
          </button>
          <button style={btnGhost} onClick={() => navClick('brief')}>
            Read full brief
          </button>
          <span style={{ ...monoStyle, marginLeft: 'auto' }}>claude · 4.2s</span>
        </div>
      </GlassCard>
    </section>
  );
}

function stamp(d: Date): string {
  const w = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
    d.getMonth()
  ];
  const hh = ((d.getHours() + 11) % 12) + 1;
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() < 12 ? 'am' : 'pm';
  return `${w} · ${m} ${d.getDate()} · ${hh}:${mm} ${ampm}`;
}
