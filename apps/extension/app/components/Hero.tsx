import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { GlassCard, Ink, OverlayText, Row, Stack, Text } from '@compass/ui';
import { getUserProfile } from '@compass/core';
import { useShell } from '../state/shell.js';
import { useScene } from '../scene/useScene.js';
import { useBrief } from '../hooks/useBrief.js';
import { buildGreeting, buildSubline, focusLabel } from '../lib/greeting.js';

interface BriefingOutput {
  tldr?: string;
  oneLineMood?: string;
  topPriority?: { title: string; why: string; suggestedFocusMinutes?: number };
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
  gap: 8,
  padding: '10px 18px',
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 500,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
  cursor: 'pointer',
};
const btnGhost: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 500,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer',
};

export function Hero() {
  const navClick = useShell((s) => s.navClick);
  const scene = useScene();
  const { state } = useBrief('morning');
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    void getUserProfile()
      .then((p) => setDisplayName(p.displayName ?? null))
      .catch(() => setDisplayName(null));
  }, []);

  const output = state.kind === 'have-brief' ? (state.brief.output as BriefingOutput) : null;

  // Status lines for the states where there is no brief to show yet. These
  // replace the sub-line rather than sitting alongside it, so the shell never
  // claims to summarise a day it has not read.
  let statusLine: string | null = null;
  if (state.kind === 'too-early') {
    const ready = new Date(state.readyAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    statusLine = `Your morning brief will be ready at ${ready}.`;
  } else if (state.kind === 'locked-no-brief') {
    statusLine = 'Your daily brief is waiting. Unlock to generate it.';
  }

  const greeting = buildGreeting(new Date(), displayName);
  const subline =
    statusLine ??
    buildSubline({
      briefMood: output?.oneLineMood ?? null,
      briefTldr: output?.tldr ?? null,
      sceneMood: scene.mood,
      fallbackBySceneMood: MOOD_TEXT,
    });

  const priority = output?.topPriority ?? null;
  const focusMinutes = priority?.suggestedFocusMinutes ?? null;

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
          {greeting.lead}
          <Ink as="em" tone="accent" style={{ fontWeight: 400 }}>
            {greeting.emphasis}
          </Ink>
          {greeting.trailing}
        </OverlayText>
        {subline && (
          <OverlayText variant="serif-body" style={{ fontSize: 18, maxWidth: 480 }}>
            {subline}
          </OverlayText>
        )}
      </Stack>

      {priority && (
        <GlassCard tier={1} style={cardWrapStyle}>
          <Stack gap={3}>
            <Text variant="mono" tone="accent" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
              Top of mind · {focusLabel(focusMinutes)}
            </Text>
            <Row gap={3} align="start">
              <Text variant="title" style={{ fontSize: 24, flex: 1 }}>
                {priority.title}
              </Text>
            </Row>
            <Text variant="serif-body">{priority.why}</Text>
            <Row gap={3} align="center">
              <button style={btnAccent} onClick={() => navClick('focus')}>
                ▶ Begin {focusLabel(focusMinutes)}
              </button>
              <button style={btnGhost} onClick={() => navClick('brief')}>
                Read full brief
              </button>
            </Row>
          </Stack>
        </GlassCard>
      )}
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
