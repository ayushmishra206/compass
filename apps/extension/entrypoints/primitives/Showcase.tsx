import type { CSSProperties } from 'react';
import {
  IconCheck,
  IconClose,
  IconPlay,
  OverlayText,
  Pill,
  Row,
  Stack,
  Surface,
  Text,
} from '@compass/ui';

const SECTIONS = [
  'Tokens',
  'Text',
  'OverlayText',
  'Pill',
  'Surface',
  'Stack & Row',
  'Slideup animation',
] as const;

const sceneStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: -1,
  background: 'linear-gradient(135deg, #1f2a3a 0%, #2a3f55 30%, #d4884d 60%, #1a120a 100%)',
};

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '32px 40px 80px',
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
  color: 'var(--color-ink)',
};

const sectionWrap: CSSProperties = {
  padding: '20px 24px',
};

const labelRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  marginBottom: 12,
};

const sampleRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
};

export function Showcase() {
  return (
    <>
      <div style={sceneStyle} aria-hidden />
      <main style={pageStyle}>
        <header>
          <OverlayText variant="mono" tone="accent">
            Compass · primitives showcase
          </OverlayText>
          <OverlayText variant="display" as="h1" style={{ marginTop: 8 }}>
            Build with{' '}
            <em style={{ fontStyle: 'normal', color: 'var(--accent-soft)' }}>primitives</em>.
          </OverlayText>
          <OverlayText variant="serif-body" style={{ marginTop: 8, maxWidth: 640 }}>
            Every variant below is what shell + drawer code should compose with. If you find
            yourself reaching for an inline <code>style={'{{ color }}'}</code> in app code, this
            page is missing a primitive.
          </OverlayText>
        </header>

        <Surface tier={2}>
          <Stack gap={3}>
            <Text variant="mono" tone="accent">
              Index
            </Text>
            <Row gap={3} align="center" style={{ flexWrap: 'wrap' }}>
              {SECTIONS.map((s) => (
                <a
                  key={s}
                  href={`#${s
                    .toLowerCase()
                    .replace(/\s+&\s+/g, '-')
                    .replace(/\s+/g, '-')}`}
                  style={{ color: 'var(--color-ink-2)', textDecoration: 'none' }}
                >
                  <Pill tone="default">{s}</Pill>
                </a>
              ))}
            </Row>
          </Stack>
        </Surface>

        <Surface id="text" tier={2} style={sectionWrap}>
          <div style={labelRow}>
            <Text variant="mono" tone="accent">
              Text
            </Text>
            <Text variant="mono" tone="dim">
              variants · tones
            </Text>
          </div>
          <Stack gap={3}>
            <Text variant="display">
              Move with{' '}
              <em style={{ fontStyle: 'normal', color: 'var(--accent-soft)' }}>momentum</em>.
            </Text>
            <Text variant="title">Morning brief</Text>
            <Text variant="heading">Suggested action</Text>
            <Text variant="serif-body">
              You&apos;ve got a reasonable morning to move things forward — the 2–4 pm block is
              where the writing will actually happen.
            </Text>
            <Text variant="body">Body sans copy at 13px.</Text>
            <Text variant="mono">Mono uppercase 10px label</Text>
            <Row gap={3} style={{ flexWrap: 'wrap' }}>
              {(['primary', 'secondary', 'muted', 'dim', 'accent'] as const).map((t) => (
                <Text key={t} variant="body" tone={t}>
                  tone:{t}
                </Text>
              ))}
            </Row>
          </Stack>
        </Surface>

        <Surface id="overlaytext" tier={1} style={sectionWrap}>
          <div style={labelRow}>
            <Text variant="mono" tone="accent">
              OverlayText
            </Text>
            <Text variant="mono" tone="dim">
              Text-on-photo recipe with shadow
            </Text>
          </div>
          <Stack gap={3}>
            <OverlayText variant="display">Stays readable</OverlayText>
            <OverlayText variant="serif-body">
              Wraps Text and applies the canonical <code>--shadow-overlay-text</code> recipe.
            </OverlayText>
            <OverlayText variant="mono" tone="accent">
              Compass · Brooklyn · 07:42
            </OverlayText>
          </Stack>
        </Surface>

        <Surface id="pill" tier={2} style={sectionWrap}>
          <div style={labelRow}>
            <Text variant="mono" tone="accent">
              Pill
            </Text>
            <Text variant="mono" tone="dim">
              tones · sizes · selected
            </Text>
          </div>
          <Stack gap={3}>
            <div style={sampleRow}>
              <Pill>default</Pill>
              <Pill tone="accent">accent</Pill>
              <Pill tone="red">P1</Pill>
              <Pill tone="blue">P3</Pill>
              <Pill tone="warn">warn</Pill>
              <Pill tone="accent" leading={<IconCheck size={9} />}>
                Suggested · 91% confident
              </Pill>
            </div>
            <div style={sampleRow}>
              <Pill size="md">2 inbox actions</Pill>
              <Pill size="md" tone="warn">
                3 back-to-backs after 1pm
              </Pill>
              <Pill size="md" selected>
                Brief
              </Pill>
            </div>
          </Stack>
        </Surface>

        <Surface id="surface" tier={2} style={sectionWrap}>
          <div style={labelRow}>
            <Text variant="mono" tone="accent">
              Surface
            </Text>
            <Text variant="mono" tone="dim">
              glass tiers 1·2·3
            </Text>
          </div>
          <Row gap={3} style={{ flexWrap: 'wrap' }}>
            {[1, 2, 3].map((t) => (
              <Surface key={t} tier={t as 1 | 2 | 3} padding="md" style={{ minWidth: 200 }}>
                <Stack gap={2}>
                  <Text variant="mono" tone="muted">
                    tier {t}
                  </Text>
                  <Text variant="title" as="h3">
                    Glass {t}
                  </Text>
                  <Text variant="serif-body">
                    A surface for {t === 1 ? 'cards' : t === 2 ? 'drawers' : 'modals'}.
                  </Text>
                </Stack>
              </Surface>
            ))}
          </Row>
        </Surface>

        <Surface id="stack-row" tier={2} style={sectionWrap}>
          <div style={labelRow}>
            <Text variant="mono" tone="accent">
              Stack & Row
            </Text>
            <Text variant="mono" tone="dim">
              gap tokens 1–6
            </Text>
          </div>
          <Stack gap={3}>
            {([1, 2, 3, 4, 5, 6] as const).map((g) => (
              <Row key={g} gap={g} align="center">
                <Text variant="mono" tone="muted" style={{ width: 60 }}>
                  gap {g}
                </Text>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Pill key={i}>·</Pill>
                ))}
              </Row>
            ))}
          </Stack>
        </Surface>

        <Surface id="slideup-animation" tier={2} style={sectionWrap}>
          <div style={labelRow}>
            <Text variant="mono" tone="accent">
              Slideup animation
            </Text>
            <Text variant="mono" tone="dim">
              600ms ease with staggered delays
            </Text>
          </div>
          <Stack gap={3}>
            <Surface tier={1} className="compass-slideup" style={{ animationDelay: '0ms' }}>
              <Row gap={3} align="center">
                <Pill tone="accent">topbar</Pill>
                <Text variant="serif-body">animation-delay: 0ms</Text>
                <Row gap={2} align="center" style={{ marginLeft: 'auto' }}>
                  <button aria-label="Play">
                    <IconPlay size={14} />
                  </button>
                  <button aria-label="Close">
                    <IconClose size={14} />
                  </button>
                </Row>
              </Row>
            </Surface>
            <Surface tier={1} className="compass-slideup" style={{ animationDelay: '100ms' }}>
              <Row gap={3} align="center">
                <Pill tone="accent">hero</Pill>
                <Text variant="serif-body">animation-delay: 100ms</Text>
              </Row>
            </Surface>
            <Surface tier={1} className="compass-slideup" style={{ animationDelay: '240ms' }}>
              <Row gap={3} align="center">
                <Pill tone="accent">ticker</Pill>
                <Text variant="serif-body">animation-delay: 240ms</Text>
              </Row>
            </Surface>
          </Stack>
        </Surface>

        <footer>
          <Text variant="mono" tone="dim">
            Reload to replay the stagger.
          </Text>
        </footer>
      </main>
    </>
  );
}
