import type { CSSProperties } from 'react';
import { Row, Text } from '@compass/ui';
import { useShell } from '../state/shell.js';
import type { AccentName } from '@compass/ui';
import { ACCENTS } from '@compass/ui';
import type { Mood } from '@compass/core';
import { ConnectedProvidersSection } from './profile/ConnectedProvidersSection';
import { DailyTimesSection } from './profile/DailyTimesSection';
import { NotesSection } from './profile/NotesSection';
import { EncryptionSection } from './profile/EncryptionSection';

const sectionWrap: CSSProperties = {
  marginBottom: 26,
  paddingBottom: 18,
  borderBottom: '1px solid var(--color-hair)',
};

const SCENE_OPTIONS: { value: Mood | null; label: string }[] = [
  { value: null, label: 'Auto (time + weather)' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'fog', label: 'Fog' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'alpine', label: 'Alpine' },
  { value: 'desert', label: 'Desert' },
];

export function ProfileDrawer() {
  const accent = useShell((s) => s.accent);
  const setAccent = useShell((s) => s.setAccent);
  const pinnedScene = useShell((s) => s.pinnedScene);
  const setPinnedScene = useShell((s) => s.setPinnedScene);
  const weatherEnabled = useShell((s) => s.weatherEnabled);
  const setWeatherEnabled = useShell((s) => s.setWeatherEnabled);

  return (
    <>
      <div style={sectionWrap}>
        <Text variant="mono" style={{ marginBottom: 10 }}>
          Accent
        </Text>
        <Row gap={2}>
          {(Object.keys(ACCENTS) as AccentName[]).map((name) => {
            const { h, c, l } = ACCENTS[name];
            return (
              <button
                key={name}
                aria-label={`Set accent to ${name}`}
                onClick={() => setAccent(name)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border:
                    accent === name ? '2px solid var(--color-ink)' : '1.5px solid transparent',
                  background: `oklch(${l} ${c} ${h})`,
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </Row>
      </div>

      <div style={sectionWrap}>
        <Text variant="mono" style={{ marginBottom: 10 }}>
          Scene
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {SCENE_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setPinnedScene(o.value)}
              style={{
                padding: '8px 10px',
                fontSize: 11,
                borderRadius: 8,
                background:
                  pinnedScene === o.value ? 'var(--accent-wash)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--color-ink)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionWrap}>
        <Text variant="mono" style={{ marginBottom: 10 }}>
          Weather-aware scenes
        </Text>
        <Row gap={3} align="center" justify="between" style={{ margin: '8px 0' }}>
          <Text variant="body" tone="muted" as="span" style={{ flex: 1, fontSize: 12 }}>
            Uses Open-Meteo with your approximate coordinates. No account required.
          </Text>
          <button
            onClick={() => setWeatherEnabled(!weatherEnabled)}
            aria-pressed={weatherEnabled}
            aria-label="Toggle weather-aware scenes"
            style={{
              width: 38,
              height: 22,
              borderRadius: 999,
              background: weatherEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.10)',
              border: 0,
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: weatherEnabled ? 18 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 120ms',
              }}
            />
          </button>
        </Row>
      </div>

      <DailyTimesSection />
      <NotesSection />
      <ConnectedProvidersSection />
      <EncryptionSection />
    </>
  );
}
