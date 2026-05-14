import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Pill, Row, Stack, Text } from '@compass/ui';
import { rpc } from '@compass/runtime';
import { MOCK } from '../mocks/index.js';

const DURATION_MIN = 25;
const DURATION_SEC = DURATION_MIN * 60;

const btnAccent: CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
};
const btnGhost: CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
};

export function FocusDrawer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState('');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(DURATION_SEC);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!running || seconds > 0) return;
    const id = activeIdRef.current;
    setRunning(false);
    setActiveId(null);
    activeIdRef.current = null;
    setSeconds(DURATION_SEC);
    if (id) {
      rpc('pomodoro.complete', { id }).catch(() => {
        /* fire-and-forget */
      });
    }
  }, [running, seconds]);

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  const startPomo = async () => {
    const id = crypto.randomUUID();
    await rpc('pomodoro.start', { id, durationMin: DURATION_MIN, theme: theme || undefined });
    activeIdRef.current = id;
    setActiveId(id);
    setSeconds(DURATION_SEC);
    setRunning(true);
  };

  const onAbandon = async () => {
    const id = activeIdRef.current;
    setRunning(false);
    setActiveId(null);
    activeIdRef.current = null;
    setSeconds(DURATION_SEC);
    if (id) {
      await rpc('pomodoro.abandon', { id });
    }
  };

  const isActive = activeId !== null;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}
    >
      <Text variant="mono" tone="accent" style={{ marginBottom: 14, letterSpacing: '0.14em' }}>
        ● {DURATION_MIN}-min Pomodoro{theme ? ` · ${theme}` : ''}
      </Text>
      <Text
        variant="display"
        as="span"
        style={{
          fontSize: 120,
          lineHeight: 1,
          fontStyle: 'normal',
          fontWeight: 300,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          margin: '4px 0 24px',
        }}
      >
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </Text>

      {!isActive && (
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="What are you working on?"
          aria-label="Pomodoro theme"
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: 12,
            fontFamily: 'var(--font-serif)',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-ink)',
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />
      )}

      <Row gap={2} style={{ marginBottom: 32 }}>
        {!isActive ? (
          <button onClick={startPomo} style={btnAccent}>
            ▶ Start
          </button>
        ) : (
          <>
            <button onClick={() => setRunning((r) => !r)} style={btnAccent}>
              {running ? '❚❚ Pause' : '▶ Resume'}
            </button>
            <button onClick={onAbandon} style={btnGhost}>
              Stop
            </button>
          </>
        )}
      </Row>
      <Text
        variant="serif-body"
        italic
        tone="muted"
        style={{
          fontSize: 14,
          textAlign: 'center',
          maxWidth: 380,
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}
      >
        &ldquo;{MOCK.brief.quotedGoal}&rdquo;
      </Text>

      <Stack gap={3} style={{ width: '100%' }}>
        <Text variant="mono">Soundscape</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {MOCK.soundscapes.map((s) => (
            <button
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-hair)',
                textAlign: 'left',
                background: s.loved ? 'rgba(255,255,255,0.04)' : 'transparent',
                color: 'var(--color-ink)',
              }}
            >
              <Text variant="body" as="span" style={{ flex: 1, fontSize: 12 }}>
                {s.name}
              </Text>
              {s.loved && (
                <Text variant="body" as="span" tone="accent">
                  ♥
                </Text>
              )}
            </button>
          ))}
        </div>
      </Stack>

      <Stack gap={3} style={{ width: '100%', marginTop: 24 }}>
        <Text variant="mono">Active blocks</Text>
        <Stack gap={2}>
          {MOCK.blockRules.map((r) => (
            <Row
              key={r.id}
              gap={3}
              align="center"
              style={{
                padding: '7px 10px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
              }}
            >
              <Pill tone={r.mode === 'hard' ? 'red' : 'accent'}>{r.mode}</Pill>
              <Text
                variant="body"
                as="span"
                tone="secondary"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
              >
                {r.pattern}
              </Text>
              {r.source === 'adaptive' && (
                <Text variant="mono" tone="dim" as="span" style={{ fontSize: 9 }}>
                  adaptive
                </Text>
              )}
            </Row>
          ))}
        </Stack>
      </Stack>
    </div>
  );
}
