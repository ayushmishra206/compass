import type { CSSProperties } from 'react';
import { GlassCard, OverlayText, Row, Stack, Text } from '@compass/ui';
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
  animationDelay: '100ms',
};
const metaStyle: CSSProperties = {
  paddingBottom: 8,
  maxWidth: 540,
};
const cardWrapStyle: CSSProperties = {
  padding: '24px 28px',
  marginBottom: 32,
  maxWidth: 520,
  justifySelf: 'end',
  alignSelf: 'end',
  width: '100%',
};
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
    <section style={sectionStyle} className="compass-slideup">
      <Stack gap={3} style={metaStyle}>
        <OverlayText
          variant="mono"
          tone="secondary"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          {stamp(new Date())}
        </OverlayText>
        <OverlayText variant="display">
          Move with{' '}
          <em style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--accent-soft)' }}>
            momentum
          </em>
          .
        </OverlayText>
        <OverlayText variant="serif-body" style={{ fontSize: 18, maxWidth: 480 }}>
          {MOOD_TEXT[scene.mood] ?? ''} {tldr}
        </OverlayText>
      </Stack>
      <GlassCard tier={1} style={cardWrapStyle}>
        <Stack gap={3}>
          <Text variant="mono" tone="accent" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
            Top of mind · 90 minutes
          </Text>
          <Row gap={3} align="start">
            <Text variant="title" style={{ fontSize: 24, flex: 1 }}>
              {b.topPriority.title}
            </Text>
          </Row>
          <Text variant="serif-body">{b.topPriority.why}</Text>
          <Row gap={2} align="center">
            <button style={btnAccent} onClick={() => navClick('focus')}>
              ▶ Begin 90 min
            </button>
            <button style={btnGhost} onClick={() => navClick('brief')}>
              Read full brief
            </button>
            <Text
              variant="mono"
              tone="secondary"
              style={{ marginLeft: 'auto', fontSize: 10, letterSpacing: '0.14em' }}
            >
              claude · 4.2s
            </Text>
          </Row>
        </Stack>
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
